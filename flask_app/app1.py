from flask import Flask, request, make_response
from datasets import load_dataset
from transformers import pipeline
import torch
from io import BytesIO
import soundfile as sf
import gc

app = Flask(__name__)

BASE_URL = 'http://127.0.0.1:5000/'

#@app.route('/asr', methods=['POST'])
def asr_model():
    transcriber = pipeline(task="automatic-speech-recognition", model="openai/whisper-small")
    return transcriber

#@app.route('/tts', methods=['POST'])
def tts_model(): 
    transcriber = pipeline(task="text-to-speech", model="microsoft/speecht5_tts")
    return transcriber

#@app.route('/llm', methods=['POST'])
def llm_model(): 
    transcriber = pipeline(task="automatic-speech-recognition", model="openai/whisper-small")
    return transcriber    

def clear_cache():
    gc.collect()
    torch.cuda.empty_cache()

MODELS = {
        "ASR": asr_model,
        "LLM": llm_model,
        "TTS": tts_model
}

OUTPUT_KEYS = {
        "ASR": "text",
        "TTS": "audio"
}

@app.route('/', methods=['POST'])
def predict():
    flow = request.form['flow']
    flow = flow.split(',')
    inp = request.files['file'].read()
    for model_name in flow:
        out = None
        clear_cache()
        try:
            model = MODELS.get(model_name)()
            if model_name == 'TTS':
                embeddings_dataset = load_dataset("Matthijs/cmu-arctic-xvectors", split="validation")
                speaker_embedding = torch.tensor(embeddings_dataset[7306]["xvector"]).unsqueeze(0)
                out = model(inp, forward_params={"speaker_embeddings": speaker_embedding})
            else:
                out = model(inp)
            print(out)
            inp = out[OUTPUT_KEYS.get(model_name)]
        except Exception as e:
            print("Exception occured while executing ", model_name, ": ", e)
            return

    buf = BytesIO()
    sf.write(buf, out["audio"], samplerate=out["sampling_rate"], format='WAV')
    response = make_response(buf.getvalue())
    buf.close()
    response.headers['Content-Type'] = 'audio/wav'
    
    out = None
    clear_cache()
    
    return response

if __name__ == '__main__':
    app.run()
