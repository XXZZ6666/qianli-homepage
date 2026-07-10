(function(){
    var isPlaying = false;
    var animId = null;
    var bars = [];

    var svgNS = "http://www.w3.org/2000/svg";
    var waveformGroup;

    function createWaveform(){
        var svg = document.querySelector(".BW svg");
        if (!svg) return;

        waveformGroup = document.createElementNS(svgNS, "g");
        waveformGroup.setAttribute("fill", "#222");
        svg.appendChild(waveformGroup);

        var barCount = 70;
        var startX = 20;
        var step = 3.8;
        bars = [];

        for (var i = 0; i < barCount; i++){
            var rect = document.createElementNS(svgNS, "rect");
            rect.setAttribute("x", startX + i * step);
            rect.setAttribute("width", 1.5);
            rect.setAttribute("y", 22.5);
            rect.setAttribute("height", 5);
            waveformGroup.appendChild(rect);
            bars.push(rect);
        }
    }

    function animate(){
        var half = Math.floor(bars.length * 2 / 3);
        for (var i = 0; i < half; i++){
            var h = Math.random() * 28 + 6;
            var y = 25 - h / 2;
            bars[i].setAttribute("height", h.toFixed(1));
            bars[i].setAttribute("y", y.toFixed(1));
        }
        for (var j = half; j < bars.length; j++){
            bars[j].setAttribute("height", 4);
            bars[j].setAttribute("y", 23);
        }
        animId = setTimeout(animate, 150);
    }

    function stopAnimate(){
        if (animId) clearTimeout(animId);
        animId = null;
        for (var i = 0; i < bars.length; i++){
            bars[i].setAttribute("height", 5);
            bars[i].setAttribute("y", 22.5);
        }
    }

    function pauseAnimate(){
        if (animId) clearTimeout(animId);
        animId = null;
    }

    // 实时时钟：HH:MM + 上标 SS
    function updateClock(){
        var timeEl = document.querySelector(".time");
        if (!timeEl) return;
        var now = new Date();
        var h = ("0" + now.getHours()).slice(-2);
        var m = ("0" + now.getMinutes()).slice(-2);
        var s = ("0" + now.getSeconds()).slice(-2);
        timeEl.innerHTML = h + ":" + m + "<sup>" + s + "</sup>";
    }

    function init(){
        createWaveform();
        updateClock();
        setInterval(updateClock, 1000);

        var btns = document.querySelectorAll(".btn button");
        if (btns[0]) btns[0].addEventListener("click", function(){
            if (!isPlaying){
                isPlaying = true;
                animate();
            }
        });
        if (btns[1]) btns[1].addEventListener("click", function(){
            isPlaying = false;
            stopAnimate();
            if (btns[2]) btns[2].textContent = "暂停";
        });
        if (btns[2]) btns[2].addEventListener("click", function(){
            if (isPlaying && animId){
                pauseAnimate();
                btns[2].textContent = "继续";
            } else if (isPlaying && !animId){
                animate();
                btns[2].textContent = "暂停";
            }
        });
    }

    if (document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();