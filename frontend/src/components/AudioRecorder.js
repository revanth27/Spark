import React, { useState, useRef, useEffect } from 'react';
import hark from 'hark';

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const startHark = async () => {
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Initialize Hark
        const speechEvents = hark(stream);

        // Set up MediaRecorder
        mediaRecorderRef.current = new MediaRecorder(stream);
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          setAudioUrl(URL.createObjectURL(audioBlob));
          audioChunksRef.current = [];
        };

        // Event listeners for speaking and stopped speaking
        speechEvents.on('speaking', () => {
          if (!isRecording) {
            mediaRecorderRef.current.start();
            setIsRecording(true);
	    console.log('set isRecording to true');
          }
        });

        speechEvents.on('stopped_speaking', () => {
          if (isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
	    console.log('set isRecording to false');
          }
        });
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    };

    startHark();

    // Cleanup function to stop the stream and recorder
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  return (
    <div>
      <h1>Audio Recorder</h1>
      {audioUrl && <audio controls src={audioUrl} />}
      <p>{isRecording ? 'Recording...' : 'Not Recording'}</p>
    </div>
  );
};

export default AudioRecorder;
