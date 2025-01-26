import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "../App.css";
import RecordRTC, { invokeSaveAsDialog } from "recordrtc";
import { Button, CircularProgress, Container, Typography, Box, Card, CardContent } from "@mui/material";

function App() {
  const [stream, setStream] = useState(null);
  const [blob, setBlob] = useState(null);
  const recorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audio] = useState(new Audio());
  const audioRef = useRef();
  const loadingRef = useRef(loading);
  const [triggered, setTriggered] = useState(false);
  
  var hark = require('../../node_modules/hark/hark.bundle.js')
  
  function onMediaSuccess(blog) {
    console.log('what?');
    var options = {};
    var speechEvents = hark(blog, options);

    speechEvents.on('speaking', function() {
      console.log('speaking', recording, loadingRef.current);
      if (!recording && !loadingRef.current) {
	setRecording(true);
	if (recorderRef.current)
	  recorderRef.current.reset();
	recorderRef.current.startRecording();
      }
    });

    speechEvents.on('stopped_speaking', async function() {
      console.log('stopped_speaking');
      if (!recording && !loadingRef.current) {
	await handleStop();
      }
      // await handleSave();
    });
  };

  const handleRecording = async () => {
    console.log('entered handleRecording');
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    });
   
    setStream(mediaStream);
    recorderRef.current = new RecordRTC(mediaStream, { 
      type: "audio", 
      mimeType: "audio/mp3",
      recorderType: RecordRTC.StereoAudioRecorder
    });
    if (!triggered) {
      setRecording(true);
      recorderRef.current.startRecording();
    } else {
      onMediaSuccess(mediaStream);
    }
  };

  const handleStop = () => {
      recorderRef.current.stopRecording(async () => {
      setRecording(false);
      let b = await recorderRef.current.getBlob();
      setBlob(b);
      if (audioRef.current) {
	audioRef.current.pause();
	audioRef.current.load();
	audioRef.current.play();
      }
      handleSave(b);
    });
  };
  
  const performASR = async (formData) => {
    try {
      const res = await fetch('http://localhost:5000/ASR', {
	method: 'POST',
	body: formData
      });
      const text = res.json()['text']
      console(res, res.json(), res.json['text'])
      const regex = RegExp(`\\bspark\\b`, 'i');
      return regex.test(text);
    } catch (err) {
      setLoading(false);
      console.log("error performing ASR: ", err);
      return false;
    }
  };

  const onSaveAudio = async (formData) => {
    try {
      const res = await fetch('http://localhost:5000/', {
	method: 'POST',
	body: formData
      });
      setLoading(false);
      console.log(loading);
      
      const audioBlob = await res.blob();
      console.log(audioBlob);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audio.src = audioUrl;
      audio.play();

    } catch (err) {
      setLoading(false);
      console.log("error fetching audio", err);
    }
  };

  const handleSave = async (b) => {
    console.log('blob: ', b);
    const audioFile = new File([b], 'voice.mp3', { type: 'audio/mp3' });
    const formData = new FormData();
    setLoading(true);
    formData.append('file', audioFile);
    if (!triggered) {
      const data = {"device": "cuda", "model": "openai/whisper-tiny"}
      formData.append('model_params', JSON.stringify(data));
      if (await performASR(formData)) {
	console.log('Triggered!!!!')
	setTriggered(true);
	setLoading(false);
	return;
      }
    }
    console.log('Normal recording');
    const data = [{"name": "ASR", "model_params": "{\"device\": \"cuda\", \"model\": \"openai/whisper-tiny\"}"}, {"name": "LLM", "model_params": "{\"device\": \"cuda\", \"model\": \"openai-gpt\"}"}, {"name": "TTS", "model_params": "{\"device\": \"cuda\", \"model\": \"microsoft/speecht5_tts\"}"}];
    formData.append('data', JSON.stringify(data));
    onSaveAudio(formData);
  };

  // useEffect(() => {
  //   handleRecording();
  // }, []);

  useEffect(() => {
    console.log('Loading status updated:', loading);
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    console.log('Triggered status updated:', triggered);
    if (triggered)
      handleRecording();
  }, [triggered]);

  return (
    <Container maxWidth="sm" sx={{ mt: 5, textAlign: 'center' }}>
      <Card raised sx={{ p: 3 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Audio Recorder
          </Typography>
	  
	  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Record button */}
	  {recording && <Button
	      variant="outlined"
	      color="error"
	      onClick={handleStop}
	      sx={{ mb: 2 }}
	    >
	      Stop Recording
	    </Button>
	  }
	  
	  {!recording && <Button
	      variant="contained"
	      color="primary"
	      onClick={handleRecording}
	      sx={{ mb: 2 }}
	    >
	      Start Recording
	    </Button>
	  }

          {/* Display send button after recording */}
          {blob && !loading && (
            <Button variant="contained" color="success"  onClick={handleSave} sx={{ mb: 2 }}
	    >
              Send Audio to Server
            </Button>
          )}
	  </Box>	  
	  

          {/* Display loading spinner while sending data */}
          {loading && <CircularProgress sx={{ mt: 2 }} />}
	  
	  {blob && (
	    <div>
	      <audio id="audio-player" controls ref={audioRef}>
		<source src={URL.createObjectURL(blob)} type={blob.type} />
		  Your browser does not support the audio element.
	      </audio>
	    </div>
	  )}

          {/* Server response */}
          {/*refResponse.current && (
            <Typography variant="body1" color="textSecondary" sx={{ mt: 3 }}>
              Response from server: {responseMessage}
            </Typography>
          )*/}
        </CardContent>
      </Card>
    </Container>
  );
}

export default App;
