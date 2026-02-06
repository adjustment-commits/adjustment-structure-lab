/* ===============================
 DOM
=============================== */

const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");

const angleDisplay = document.getElementById("angleDisplay");
const evalDisplay = document.getElementById("evalDisplay");
const peakDisplay = document.getElementById("peakDisplay");
const scapulaPeakDisplay = document.getElementById("scapulaPeakDisplay");
const armScapulaPeakDisplay = document.getElementById("armScapulaPeakDisplay");

const startBtn = document.getElementById("startBtn");
const loadVideoBtn = document.getElementById("loadVideoBtn");
const resetBtn = document.getElementById("resetBtn");
const playPauseBtn = document.getElementById("playPauseBtn");
const timeSlider = document.getElementById("timeSlider");
const videoInput = document.getElementById("videoInput");

const modeSelect = document.getElementById("modeSelect");
let currentMode = "pitch";

/* ===============================
 Utility
=============================== */

function vector(a,b){
  return { x: b.x - a.x, y: b.y - a.y };
}

function magnitude(v){
  return Math.sqrt(v.x*v.x + v.y*v.y);
}

function dot(a,b){
  return a.x*b.x + a.y*b.y;
}

function angleBetween(v1,v2){
  const cos = dot(v1,v2)/(magnitude(v1)*magnitude(v2));
  const rad = Math.acos(Math.min(Math.max(cos,-1),1));
  return rad * 180 / Math.PI;
}

/* ===============================
 Mode
=============================== */

modeSelect.addEventListener("change",()=>{
  currentMode = modeSelect.value;
});

/* ===============================
 MediaPipe Pose
=============================== */

const pose = new Pose({
  locateFile:(file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
  modelComplexity:1,
  smoothLandmarks:true,
  enableSegmentation:false,
  minDetectionConfidence:0.5,
  minTrackingConfidence:0.5
});

pose.onResults(onResults);

/* カメラ用 */
const camera = new Camera(videoElement,{
  onFrame: async()=>{
    await pose.send({image:videoElement});
  },
  width:640,
  height:480
});

/* ===============================
 Video Metadata
=============================== */

videoElement.addEventListener("loadedmetadata",()=>{
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
  timeSlider.max = videoElement.duration;
});

/* ===============================
 Buttons
=============================== */

startBtn.addEventListener("click",()=>{
  camera.start();
});

loadVideoBtn.addEventListener("click",()=>{
  videoInput.click();
});

videoInput.addEventListener("change",(e)=>{
  const file = e.target.files[0];
  if(!file) return;

  const url = URL.createObjectURL(file);
  videoElement.src = url;
  videoElement.play();
  playPauseBtn.textContent = "PAUSE";
  processVideo();
});

playPauseBtn.addEventListener("click",()=>{
  if(videoElement.paused){
    videoElement.play();
    playPauseBtn.textContent = "PAUSE";
    processVideo();
  }else{
    videoElement.pause();
    playPauseBtn.textContent = "PLAY";
  }
});

resetBtn.addEventListener("click",()=>{
  location.reload();
});

/* ===============================
 Slider
=============================== */

timeSlider.addEventListener("input",()=>{
  videoElement.currentTime = timeSlider.value;
});

videoElement.addEventListener("timeupdate",()=>{
  timeSlider.value = videoElement.currentTime;
});

/* ===============================
 Video Loop
=============================== */

async function processVideo(){
  if(videoElement.paused || videoElement.ended) return;
  await pose.send({image:videoElement});
  requestAnimationFrame(processVideo);
}

/* ===============================
 Peaks
=============================== */

let peakThoraxArm = 0;
let peakThoraxScapula = 0;
let peakScapulaArm = 0;

/* ===============================
 Main
=============================== */

function onResults(results){

  canvasCtx.clearRect(0,0,canvasElement.width,canvasElement.height);

  if(!results.poseLandmarks) return;

  drawConnectors(canvasCtx,results.poseLandmarks,POSE_CONNECTIONS,
    {color:"#555",lineWidth:2});

  drawLandmarks(canvasCtx,results.poseLandmarks,
    {color:"#22c55e",lineWidth:1});

  const LShoulder = results.poseLandmarks[11];
  const RShoulder = results.poseLandmarks[12];
  const RElbow = results.poseLandmarks[14];
  const LHip = results.poseLandmarks[23];
  const RHip = results.poseLandmarks[24];

  const thorax = vector(LShoulder,RShoulder);
  const arm = vector(RShoulder,RElbow);

  const thoraxCenter = {
    x:(LShoulder.x+RShoulder.x)/2,
    y:(LShoulder.y+RShoulder.y)/2
  };

  const pelvisCenter = {
    x:(LHip.x+RHip.x)/2,
    y:(LHip.y+RHip.y)/2
  };

  const scapulaCenter = {
    x:(thoraxCenter.x+pelvisCenter.x)/2,
    y:(thoraxCenter.y+pelvisCenter.y)/2
  };

  const scapulaVec = vector(scapulaCenter,RShoulder);

  const thoraxArmAngle = angleBetween(thorax,arm);
  const thoraxScapulaAngle = angleBetween(thorax,scapulaVec);
  const scapulaArmAngle = angleBetween(scapulaVec,arm);

  angleDisplay.textContent = thoraxArmAngle.toFixed(1)+"°";

  if(thoraxArmAngle > peakThoraxArm){
    peakThoraxArm = thoraxArmAngle;
    peakDisplay.textContent =
      "胸郭×上腕ピーク："+peakThoraxArm.toFixed(1)+"°";
  }

  if(thoraxScapulaAngle > peakThoraxScapula){
    peakThoraxScapula = thoraxScapulaAngle;
    scapulaPeakDisplay.textContent =
      "胸郭×肩甲帯ピーク："+peakThoraxScapula.toFixed(1)+"°";
  }

  if(scapulaArmAngle > peakScapulaArm){
    peakScapulaArm = scapulaArmAngle;
    armScapulaPeakDisplay.textContent =
      "肩甲帯×上腕ピーク："+peakScapulaArm.toFixed(1)+"°";
  }

  let evalText="";

  if(currentMode==="pitch"){
    if(thoraxArmAngle<20) evalText="腕主導";
    else if(thoraxArmAngle<35) evalText="分離小";
    else if(thoraxArmAngle<50) evalText="実用分離";
    else evalText="高分離";
  }

  if(currentMode==="bat"){
    if(thoraxArmAngle<20) evalText="手打ち傾向";
    else if(thoraxArmAngle<35) evalText="分離小トップ";
    else if(thoraxArmAngle<50) evalText="実用トップ";
    else evalText="高捻転差トップ";
  }

  evalDisplay.textContent="評価："+evalText;

  drawLine(LShoulder,RShoulder,"#38bdf8");     // thorax
  drawLine(scapulaCenter,RShoulder,"#f472b6"); // scapula
  drawLine(RShoulder,RElbow,"#facc15");        // arm
}

/* ===============================
 Drawing
=============================== */

function drawLine(a,b,color){
  canvasCtx.beginPath();
  canvasCtx.moveTo(a.x*canvasElement.width,a.y*canvasElement.height);
  canvasCtx.lineTo(b.x*canvasElement.width,b.y*canvasElement.height);
  canvasCtx.strokeStyle=color;
  canvasCtx.lineWidth=4;
  canvasCtx.stroke();
}
