import React, { useState, useRef, useEffect } from "react";
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

  const handleRecording = async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    });

    setStream(mediaStream);
    recorderRef.current = new RecordRTC(mediaStream, { 
      type: "audio", 
      mimeType: "audio/wav",
      recorderType: RecordRTC.StereoAudioRecorder
    });
    setRecording(!recording);
    recorderRef.current.startRecording();
  };

  const handleStop = () => {
    recorderRef.current.stopRecording(() => {
      setRecording(!recording);
      setBlob(recorderRef.current.getBlob());
    });
  };
  
  const onSaveAudio = async (formData) => {
    try {
      const res = await fetch('http://localhost:5000/', {
	method: 'POST',
	body: formData
      });
      setLoading(false);
      console.log(res);
      
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

  const handleSave = () => {
    // invokeSaveAsDialog(blob);
    const audioFile = new File([blob], 'voice.wav', { type: 'audio/wav' });
    const formData = new FormData();
    setLoading(!loading);
    formData.append('file', audioFile);
    const data = [{"name": "ASR", "model_params": "{\"device\": \"cuda\", \"model\": \"openai/whisper-tiny\"}"}, {"name": "LLM", "model_params": "{\"device\": \"cuda\", \"model\": \"openai-gpt\"}"}, {"name": "TTS", "model_params": "{\"device\": \"cuda\", \"model\": \"microsoft/speecht5_tts\"}"}];
    formData.append('data', JSON.stringify(data));
    onSaveAudio(formData);
  };

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
