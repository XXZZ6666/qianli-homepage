const api = "https://cn.apihz.cn/api/tianqi/tqybip.php?id=10018490&key=cdc294ee577ac2bd96bfa8651dab80b3";

function showWeather(data){
    var now = data.nowinfo || {};
    document.getElementById('weather').textContent = (data.weather1 === data.weather2)?data.weather1:(data.weather1+"转"+data.weather2);
    document.getElementById('temperature').textContent = now.temperature + "℃";
    document.getElementById('place').textContent = data.guo + " " + data.sheng + " " + data.shi;
    document.getElementById('uptime').textContent = now.uptime;
}

function fetcheather(){
    document.getElementById('status').textContent = "加载中...";
    fetch(api)
        .then(response => response.json())
        .then(result => {
            if(result.code === 200){
                showWeather(result);
                document.getElementById('status').textContent = "";
            }
            else{
                document.getElementById('status').textContent = "加载失败："+result.msg;
            }
        })
        .catch(error => {
            document.getElementById('status').textContent = "❌ 网络请求失败（" + error.message + "）";
        });
}

document.addEventListener('DOMContentLoaded', function() {
    fetcheather();
    setInterval(fetcheather, 60000);
    document.getElementById('refreshbtn').addEventListener('click', fetcheather);
});