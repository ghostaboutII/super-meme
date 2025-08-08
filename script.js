// Run Game - script.js
'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const overlay = document.getElementById('overlay');
const finalScore = document.getElementById('finalScore');
const scoreVal = document.getElementById('scoreVal');
const bestVal = document.getElementById('bestVal');

let DPR = window.devicePixelRatio || 1;
function resizeCanvas(){
  DPR = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(rect.width * DPR));
  canvas.height = Math.max(200, Math.floor(rect.height * DPR));
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
new ResizeObserver(resizeCanvas).observe(canvas);

let game = null;
startBtn.addEventListener('click',()=>{ startGame(); });
restartBtn && restartBtn.addEventListener('click',()=>{ startGame(); });

// Input: touch & keyboard
let input = { jump:false };
document.addEventListener('keydown', e=>{ if(e.code==='Space'){ input.jump=true; e.preventDefault(); } });
document.addEventListener('keyup', e=>{ if(e.code==='Space'){ input.jump=false; } });
document.addEventListener('touchstart', e=>{ input.jump=true; e.preventDefault(); setTimeout(()=>input.jump=false,100); }, {passive:false});

// Simple audio helper (uses small WAVs in assets)
function playSound(name, volume=0.9){
  try{
    const a = new Audio(`assets/${name}`);
    a.volume = volume;
    a.play();
  }catch(e){}
}

// Utilities
function rand(min,max){ return Math.random()*(max-min)+min; }
function rectsOverlap(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

// Game class
class RunGame {
  constructor(){
    this.reset();
    this.bind();
  }
  reset(){
    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;
    this.ground = this.height - 80;
    this.player = { x:60, y:this.ground-48, w:44, h:44, dy:0, jumpPower:-13, grounded:true, canDouble:true };
    this.obstacles = [];
    this.coins = [];
    this.stars = [];
    this.particles = [];
    this.frame = 0;
    this.score = 0;
    this.speed = 5;
    this.gameOver=false;
    this.invincible=false;
    this.invTimer=0;
    this.best = Number(localStorage.getItem('run_best') || 0);
    bestVal.textContent = this.best;
  }
  bind(){ this._loop = this.loop.bind(this); }
  start(){
    this.reset();
    overlay.classList.add('hidden');
    this.lastTime = performance.now();
    requestAnimationFrame(this._loop);
  }
  end(){
    this.gameOver = true;
    finalScore.textContent = this.score;
    overlay.classList.remove('hidden');
    if(this.score > this.best){
      localStorage.setItem('run_best', String(this.score));
      bestVal.textContent = this.score;
    }
    playSound('gameover.wav', 0.9);
  }
  spawnObstacle(){
    const h = Math.random() < 0.6 ? rand(28,44) : rand(56,84);
    this.obstacles.push({ x:this.width+20, y:this.ground-h, w: 18, h:h });
  }
  spawnCoin(){
    this.coins.push({ x:this.width+10, y:this.ground-60-rand(0,80), r:8, collected:false });
  }
  spawnStar(){ this.stars.push({ x:this.width+10, y:this.ground-80-rand(0,60), r:10 }); }
  loop(t){
    if(this.gameOver) return;
    const dt = Math.min(40, t - this.lastTime);
    this.lastTime = t;
    this.update(dt/16.67);
    this.draw();
    requestAnimationFrame(this._loop);
  }
  update(scale){
    this.frame++;
    // speed up gently
    if(this.frame % 600 === 0) this.speed += 0.4;
    // player physics
    this.player.dy += 0.6 * scale;
    this.player.y += this.player.dy * scale;
    if(this.player.y >= this.ground - this.player.h){
      this.player.y = this.ground - this.player.h;
      this.player.dy = 0;
      this.player.grounded = true;
      this.player.canDouble = true;
    } else this.player.grounded = false;
    // input jump (edge detect)
    if(input.jump){
      if(this.player.grounded){
        this.player.dy = this.player.jumpPower;
        this.player.grounded = false;
        playSound('jump.wav', 0.4);
      } else if(this.player.canDouble){
        this.player.dy = this.player.jumpPower;
        this.player.canDouble = false;
        playSound('jump.wav', 0.35);
      }
      input.jump = false;
    }
    // spawn obstacles/coins/stars
    if(this.frame % Math.max(45, 120 - Math.floor(this.speed*4)) === 0) this.spawnObstacle();
    if(this.frame % 100 === 0) this.spawnCoin();
    if(this.frame % 700 === 0) this.spawnStar();
    // move obstacles/coins
    for(let o of this.obstacles) o.x -= this.speed * scale;
    this.obstacles = this.obstacles.filter(o=>o.x+o.w> -50);
    for(let c of this.coins) c.x -= this.speed * scale;
    this.coins = this.coins.filter(c=>c.x + c.r > -50 && !c.collected);
    for(let s of this.stars) s.x -= this.speed * scale;
    this.stars = this.stars.filter(s=>s.x + s.r > -50);
    // collisions
    for(let o of this.obstacles){
      if(rectsOverlap({x:this.player.x,y:this.player.y,w:this.player.w,h:this.player.h},
                      {x:o.x,y:o.y,w:o.w,h:o.h})){
        if(!this.invincible){ this.end(); return; }
      }
    }
    for(let i=this.coins.length-1;i>=0;i--){
      let c=this.coins[i];
      const dx = (this.player.x+this.player.w/2) - c.x;
      const dy = (this.player.y+this.player.h/2) - c.y;
      if(Math.hypot(dx,dy) < c.r + Math.max(this.player.w,this.player.h)/3){
        this.score += 50;
        playSound('coin.wav', 0.5);
        this.coins.splice(i,1);
      }
    }
    for(let i=this.stars.length-1;i>=0;i--){
      let s=this.stars[i];
      const dx = (this.player.x+this.player.w/2) - s.x;
      const dy = (this.player.y+this.player.h/2) - s.y;
      if(Math.hypot(dx,dy) < s.r + Math.max(this.player.w,this.player.h)/3){
        this.invincible = true;
        this.invTimer = 300;
        playSound('coin.wav', 0.6);
        this.stars.splice(i,1);
      }
    }
    if(this.invincible){
      this.invTimer--;
      if(this.invTimer<=0) this.invincible=false;
    }
    // score
    this.score += 1;
    scoreVal.textContent = this.score;
  }
  draw(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    // clear
    ctx.clearRect(0,0,w,h);
    // sky (simple gradient)
    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,'#cfefff'); grad.addColorStop(1,'#e6f7ff');
    ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
    // ground
    ctx.fillStyle = '#2fa02f'; ctx.fillRect(0,this.ground,w,h-this.ground);
    // parallax subtle lines
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for(let i=0;i<6;i++) ctx.fillRect((this.frame*0.3 + i*120) % w, this.ground - 20, 80, 4);
    // player
    ctx.fillStyle = this.invincible ? '#FFD700' : '#2B6CFF';
    ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);
    // obstacles
    ctx.fillStyle = '#C33';
    for(let o of this.obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);
    // coins
    ctx.fillStyle = '#FFC700';
    for(let c of this.coins){
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
    }
    // stars
    ctx.fillStyle = '#9B59B6';
    for(let s of this.stars){
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    }
  }
}

function startGame(){
  if(game && !game.gameOver) return;
  game = new RunGame();
  game.start();
  playSound('start.wav', 0.6);
}

window.addEventListener('blur', ()=>{ input.jump=false; });
// expose for debug
window._runGame = { start:startGame };
