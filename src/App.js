import React, {useEffect, useRef, useState} from 'react';
import './App.css';
import { initNotifications, notify } from '@mycv/f8-notification';

import {Howl, Howler} from 'howler';
import showURL from './assets/warning.mp3'

var sound = new Howl({
  src: [showURL]
});

const tf = require('@tensorflow/tfjs');
const mobilenetModule = require('@tensorflow-models/mobilenet');
const knnClassifier = require('@tensorflow-models/knn-classifier')
const mobilenet = require('@tensorflow-models/mobilenet');


const NOT_TOUCH = 'not_touch';
const TOUCHED = 'touched';
const TRAINING_TIME = 100;
const TOUCH_Confidences = 0.8;


function App() {
  const video = useRef();
  const model = useRef();
  const classifier = useRef();
  const audioCanShow = useRef(true);
  const [touch, setTouch] = useState(false);

  const init = async () => {
    console.log("init...");
    await setUpCam();

    model.current = await mobilenet.load();
    classifier.current = knnClassifier.create();

    console.log("setUp success");
    console.log("Đừng sờ tay lên mặt và bấm train 1");

    initNotifications({ cooldown: 3000 });
  }

  const setUpCam = () =>{
    return new Promise((resolve, reject) =>{
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

      if(navigator.getUserMedia){
        navigator.getUserMedia(
          {video: true},
          stream =>{
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve);
          },
          error => reject(error)
        );
      }else{
        reject();
      }
    });
  }

  const train = async label =>{
    console.log(`[${label}] đang train model...`);
    for(let i = 0; i < TRAINING_TIME; i++){
      console.log(`Progress ${(i+1) / TRAINING_TIME * 100}%`)
      await training(label);
    }
  }

  const training = label => {
    return new Promise( async (resolve, reject) => {
      const embedding = model.current.infer(
        video.current,
        true,
      );
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    })
  }

  const run = async () =>{
    const embedding = model.current.infer(
      video.current,
      true,
    );
    const result = await classifier.current.predictClass(embedding);
    if(result.label === TOUCHED && result.confidences[result.label] > TOUCH_Confidences){
      console.log("Touched");
      if(audioCanShow.current){
        audioCanShow.current = false;
        sound.play();
      }
      notify('Vui lòng bỏ tay xuống', { body: 'Bạn vừa chạm tay vào mặt!' });
      setTouch(true);
    }else{
      console.log("Not touch");
      setTouch(false);
    }

    await sleep(200);

    run();
  }

  const sleep = (ms = 0) =>{
    return new Promise(resolve =>setTimeout(resolve,ms))
  }

  useEffect(() =>{
    init();

    sound.on('end', function(){
      audioCanShow.current = true;
    });

    return () =>{

    }
  }, [])

  return (
    <div className={`main ${touch ? 'touched' : ''}`}>
      <video className='video'  autoPlay ref={video}/>
      <div className="control">
        <button className="btn" onClick={(e)=> train(NOT_TOUCH)}>Train 1</button>
        <button className="btn" onClick={(e)=> train(TOUCHED)}>Train 2</button>
        <button className="btn" onClick={(e)=> run()}>Run</button>
      </div>
    </div>
  );
}

export default App;
