window.onload = async () => {
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('2d');
  const copy = document.querySelector(".copy")
  const camera = document.querySelector(".camera")
  const tools = document.querySelector(".tools")
  const start = document.querySelector(".start")

  const isMobile = detectMob()

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
        document.fullscreenElement = document.body
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