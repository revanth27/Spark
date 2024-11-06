from flask import Flask, request, make_response, Response
from datasets import load_dataset
from transformers import pipeline
import torch
from io import BytesIO
import soundfile as sf
import gc
import requests
import json
from huggingface_hub import login
from flask_cors import CORS

login(token = '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')

app = Flask(__name__)
CORS(app)

BASE_URL = 'http://127.0.0.1:5000/'

@app.route('/ASR', methods=['POST'])
def asr_model():
    print('Into ASR...')
    params = json.loads(request.form['model_params'])
    transcriber = pipeline(task="automatic-speech-recognition", **params)
    out = transcriber((request.files['file']).read())
    print(out)
    response = make_response(json.dumps(out))
    response.headers['Content-Type'] = 'application/json'
    return response

@app.route('/TTS', methods=['POST'])
def tts_model():
    print ('Into TTS...')
    params = json.loads(request.json['model_params'])
    synthesizer = pipeline(task="text-to-speech", **params)
    
    embeddings_dataset = load_dataset("Matthijs/cmu-arctic-xvectors", split="validation")
    speaker_embedding = torch.tensor(embeddings_dataset[7306]["xvector"]).unsqueeze(0)
    
    print(request.json)
    out = synthesizer(request.json['text'], forward_params={"speaker_embeddings": speaker_embedding})
    print(out) 
    buf = BytesIO()
    sf.write(buf, out["audio"], samplerate=out["sampling_rate"], format='WAV')
    response = make_response(buf.getvalue())
    buf.close()
    response.headers['Content-Type'] = 'audio/wav'
    return response

@app.route('/LLM', methods=['POST'])
def llm_model():
    params = json.loads(request.json['model_params'])
    model = pipeline(task="text-generation", **params)
    out = model(request.json['text'])[0]
    print(out)
    resp = {}
    resp['text'] = out['generated_text']
    response = make_response(json.dumps(resp))
    response.headers['Content-Type'] = 'application/json'
    return response

def clear_cache():
    gc.collect()
    torch.cuda.empty_cache()

@app.route('/', methods=['POST'])
def predict():
    print('Entered predict')
    data = {}
    files = request.files
    models = json.loads(request.form['data'])
    headers = {'Content-type': request.content_type}
    for model in models:
        try:
            url = BASE_URL + model['name']
            data['model_params'] = model['model_params']
            print(data)
            if headers['Content-type'] == 'application/json':
                response = requests.post(url, json=data)
            elif 'multipart/form-data' in headers['Content-type']:
                response = requests.post(url, data=data, files=files)
            else:
                response = requests.post(url, headers=headers, data=data)
            if response.headers['Content-Type'] == 'application/json':
                data = response.json()
            else:
                data = response.content
            headers['Content-type'] = response.headers['Content-Type']
            clear_cache()
        except Exception as e:
            print("Exception occured while executing ", model['name'], ": ", e)
            clear_cache()
            return

    clear_cache()
    return Response(response.content, mimetype=response.headers['Content-type'])

if __name__ == '__main__':
    app.run(debug = True)
