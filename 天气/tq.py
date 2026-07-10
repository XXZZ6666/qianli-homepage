import requests
import time
from flask import Flask, jsonify
from flask_cors import CORS
app = Flask(__name__)
CORS(app)

api_url="https://cn.apihz.cn/api/tianqi/tqybip.php"
params = {
    "id": "10018490",
    "key": "cdc294ee577ac2bd96bfa8651dab80b3",
}

@app.route('/weather')
def get_weather():
    try:
        response = requests.get(api_url, params=params)
        data=response.json()
        if data.get("code") == 200:
            now=data.get("nowinfo",{})
            resultg={
                "place":f"{data.get('guo')} {data.get('sheng')} {data.get('shi')}",
                "temperature":now.get('temperature'),
                "weather1":data.get('weather1'),
                "weather2":data.get('weather2'),
                "uptime":now.get('uptime'),
            }
            return jsonify({"code":200,"data":resultg})
        else:
            return jsonify({"code":500,"msg":data.get("msg" ,"获取天气失败")})     
    except Exception as e:
        return jsonify({"code":500,"msg":str(e)})
    
if __name__ == '__main__':
    print("🌤️ 天气服务启动: http://localhost:5000/weather")
    print("浏览器打开 tq.html 即可查看")
    app.run(host='0.0.0.0', port=5000)