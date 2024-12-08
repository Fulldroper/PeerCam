window.mobileAndTabletCheck = function() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};
window.onload = async () => {
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('2d');
  const copy = document.querySelector(".copy")
  const camera = document.querySelector(".camera")
  const tools = document.querySelector(".tools")
  const start = document.querySelector(".start")
  const isMobile = navigator.userAgentData.mobile
  const hostid = window.location.hash.slice(1);
  // const connections = [];

  // hide on client tools
  if (hostid) {
    tools.style.display = "none"
    start.style.display = "none";
  };
  
  // prevent download camera image
  canvas.oncontextmenu = e => e.preventDefault();

  // Автоматичне масштабування canvas до розмірів вікна
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }  

  // Адаптивність
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas(); // Початкове встановлення розміру

  // Отримання списку серверів
  let iceServers = await fetch("https://fulldroper.metered.live/api/v1/turn/credentials?apiKey=20b057434f2dba67cce42dbf43a66658ba5d")
    .then(r => r.json());
  
  if (!iceServers || iceServers.error) {
    console.error("TURN сервер недоступний")
  };
  // iceServers = []

  // Створення піру
  const peer = new Peer({
    config: { iceServers },
    timeout: 120000
  });

  // Запуск вебкамери
  async function startWebcam() {
    try {
      // Створюємо елемент відео (без додавання в DOM)
      const video = document.createElement('video');
      video.srcObject = streamController.stream;
      video.autoplay = true;
      video.playsInline = true;

      // Встановлюємо рендеринг відео на canvas
      function drawFrame() {
        const videoRatio = video.videoWidth / video.videoHeight;
        const canvasRatio = canvas.width / canvas.height;

        let drawWidth, drawHeight;

        if (canvasRatio > videoRatio) {
          // Обмеження по висоті
          drawHeight = canvas.height;
          drawWidth = drawHeight * videoRatio;
        } else {
          // Обмеження по ширині
          drawWidth = canvas.width;
          drawHeight = drawWidth / videoRatio;
        }

        // Центрування
        const xOffset = (canvas.width - drawWidth) / 2;
        const yOffset = (canvas.height - drawHeight) / 2;

        context.clearRect(0, 0, canvas.width, canvas.height); // Очищуємо canvas
        context.drawImage(video, xOffset, yOffset, drawWidth, drawHeight); // Малюємо відео
        requestAnimationFrame(drawFrame); // Оновлюємо кадр
      }

      video.addEventListener('loadedmetadata', () => {
        resizeCanvas(); // Встановлюємо початковий розмір canvas
        drawFrame(); // Починаємо рендеринг
      });

    } catch (err) {
      console.error('Помилка доступу до вебкамери:', err);
    }
  }

  let streamController = {
    _stream: null, // приватне значення
    _currentCameraIndex: 1,
    _videoDevices: [],
  
    // Геттер
    get stream() {
      return this._stream;
    },

    get videoDevices() {
      return this._videoDevices;
    },
  
    // Сеттер
    set stream(value) {
      this._stream = value;
      // Запуск стріму
      startWebcam();
    },

    // Функція для отримання доступних камер
    async getVideoDevices() {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this._videoDevices = devices.filter(device => device.kind === "videoinput");
      return this._videoDevices;
    },

    // Функція для запуску камери
    async switchCamera() {
      try {
        // Отримуємо потік з новою камерою
        const constraints = {
          video: { deviceId: { exact: this._videoDevices[this._currentCameraIndex].deviceId } },
        };

        const Nstream = await navigator.mediaDevices.getUserMedia(constraints);
        if (this._stream) {
          const Otrack = this._stream.getVideoTracks()[0]
          this._stream.removeTrack(Otrack)
          const Ntrack = Nstream.getVideoTracks()[0]
          this._stream.addTrack(Ntrack)
        } else {
          this._stream = Nstream
        }

        // відправляємо сигнал на оновлення кліентам
        // Перебираємо всі з'єднання
        // for (const connection in connections) {
        //   connection.send("refresh");
        // }
        
        // Оновлюємо індекс камери для наступного переключення
        this._currentCameraIndex = (this._currentCameraIndex + 1) % this._videoDevices.length;
      } catch (error) {
        console.error("Помилка при перемиканні камери:", error);
      }
    }
  };

  peer.on("open", async (id) => {
    if (!hostid) {
      start.onclick = async () => {
        if (isMobile) {
          document.fullscreenElement = document.body
        }
        start.style.display = "none";
        // Транслятор (отримання камери)
        streamController.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const cameras = await streamController.getVideoDevices()
        
        // зміна камери 
        camera.onclick = async () => {
          if (cameras.length > 0) {
            await streamController.switchCamera()
          } else {
            console.log("Камери не знайдено.");
          }
        };
        // запис hostid в hash
        window.location.hash = id;
        // запис адреси в буфер обміну
        copy.onclick = () => {
          navigator.clipboard.writeText(window.location.href)  
        }
  
        peer.on("call", c => {
          if (!streamController.stream) return console.error("Локальний потік недоступний");
          c.answer(streamController.stream);
        });
  
        // peer.on("connection", c => connections.push(c))
      }
    } else {
      // Функція створення пустого медіа потоку (аудіо + відео)
      const createMediaStreamFake = (opt = {}) => {
        const { videoWidth = 640, videoHeight = 480 } = opt
        const _a = new MediaStream(); // Потік

        const _c = document.createElement('canvas');
        _c.width = videoWidth;
        _c.height = videoHeight;

        // Малюємо порожнє зображення на canvas
        const _d = _c.getContext('2d');
        _d.fillRect(0, 0, videoWidth, videoHeight); // Заповнюємо canvas чорним або іншим кольором

        // Захоплюємо потік з canvas
        const _e = _c.captureStream().getVideoTracks()[0];
        _e.enabled = false; // Вимикаємо відео трек
        _a.addTrack(_e);
        
        return _a;
      };
      
      // Глядач (виклик хоста)
      const c = await peer.call(hostid, createMediaStreamFake());
      
      if (!c) return console.error("Не вдалося ініціювати виклик. Перевірте ID хоста.");

      c.on("stream", s => streamController.stream = s);
      c.on("error", e => console.error("Помилка виклику:", e));
      
    }
  });
  
  // // Обробник отримання повідомлення
  // peer.on("connection", c2 => {
  //   c2.on('data', (data) => {
  //     console.log('Received data:', data);
  //   });
  // })

  peer.on("error", e => console.error("Помилка Peer.js:", e));

};