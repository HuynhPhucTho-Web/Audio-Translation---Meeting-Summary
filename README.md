# 🎙️ AI Meeting Translator & Live Subtitle

> **Hệ thống phiên dịch cuộc họp trực tiếp đa ngôn ngữ, phụ đề song ngữ Realtime & Tự động tóm tắt cuộc họp bằng AI (React + Vite + Tailwind CSS + Node.js + WebSockets + OpenAI)**

---

## 🌟 4 Chức Năng Cốt Lõi

1. **🎙️ Thu âm cuộc họp & Sóng âm trực tiếp (Live Waveform)**:
   - Thu âm microphone qua `navigator.mediaDevices.getUserMedia`.
   - Phân tích tần số âm thanh & cường độ qua Web Audio API (`AudioContext`, `AnalyserNode`).
   - Hiển thị Waveform 24 dải động thời gian thực với đồng hồ bấm giờ trực quan.
2. **🌐 Tự động nhận diện ngôn ngữ & Dịch trực tiếp (Language Detection & Translation)**:
   - Tự động phát hiện ngôn ngữ người nói (English 🇬🇧, Tiếng Việt 🇻🇳, Tiếng Nhật 🇯🇵, Tiếng Hàn 🇰🇷, v.v.) kèm tỷ lệ tin cậy (Confidence %).
   - Dịch trực tiếp đa ngôn ngữ (chọn một hoặc nhiều ngôn ngữ đích song song).
3. **📝 Live Subtitle & Phân loại câu nói (Sentence Intent Classification)**:
   - Hiển thị phụ đề 2 dòng: Người nói + Bản gốc & Bản dịch kèm cờ quốc gia.
   - AI tự động gán nhãn phân loại từng phát ngôn:
     - 💬 **Statement** (Ý kiến, nhận xét)
     - ❓ **Question** (Câu hỏi, làm rõ)
     - 💡 **Idea** (Đề xuất, ý tưởng)
     - ⚠️ **Problem** (Sự cố, rủi ro, lỗi)
     - ✅ **Decision** (Quyết định thống nhất)
     - 📌 **Action** (Việc cần làm)
     - 📅 **Deadline** (Hạn chót, mốc thời gian)
   - Tự động cuộn theo thời gian thực và hỗ trợ Text-to-Speech (TTS) đọc to bản dịch.
4. **🤖 Tự động tóm tắt & Phân loại nội dung cuộc họp (AI Meeting Summary)**:
   - Thống kê thời lượng và danh sách người tham gia.
   - Trích xuất **📌 Chủ đề chính (Key Topics)**.
   - Tổng hợp **✅ Quyết định thống nhất (Decisions)**.
   - Lập danh sách **📋 Việc cần làm (Action Items)** có phân công người phụ trách và deadline dạng checklist tương tác.
   - Bản tóm tắt tổng quan chi tiết và tính năng **Xuất file** (📄 TXT, 📑 PDF, 📝 DOCX, 📋 Copy).

---

## 🏗️ Kiến Trúc Hệ Thống (Architecture)

```
                    ┌─────────────────────────┐
                    │  React + Vite Frontend  │
                    │   (Tailwind, Zustand)   │
                    └────────────┬────────────┘
                                 │
                        WebSocket / HTTP
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     Node.js Backend     │
                    │    (Express + ws)       │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
     Speech-to-Text         Translation         AI Summary
    (OpenAI Whisper)       (gpt-4o-mini)      & Action Items
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 ▼
                       Meeting Local Storage
```

---

## 📁 Cấu Trúc Thư Mục (Project Structure)

```
Audio-Translation---Meeting-Summary/
├── src/
│   ├── components/
│   │   ├── AudioRecorder/         # Bảng điều khiển thu âm & đồng hồ
│   │   ├── LiveSubtitle/          # Khung phụ đề 2 dòng thời gian thực
│   │   ├── LanguageSelector/      # Lựa chọn & nhận diện ngôn ngữ
│   │   ├── SpeakerMessage/        # Khung tin nhắn phụ đề và phân loại ý kiến
│   │   ├── MeetingSummary/        # Báo cáo tóm tắt, quyết định & việc cần làm
│   │   ├── MeetingTopics/         # Thẻ chủ đề chính (Topic tags)
│   │   ├── Waveform/              # Sóng âm thanh trực tiếp (Web Audio API)
│   │   └── Settings/              # Cài đặt API key, Model, Microphone, Demo mode
│   │
│   ├── pages/
│   │   ├── Home.jsx               # Giới thiệu & lối tắt nhanh
│   │   ├── Meeting.jsx            # Giao diện chính 3 Tab (Live, Transcript, Summary)
│   │   └── History.jsx            # Lịch sử các cuộc họp đã lưu
│   │
│   ├── services/
│   │   ├── audioService.js        # Web Audio API, MediaRecorder & Analyser
│   │   ├── realtimeService.js     # WebSocket client & luồng phát dữ liệu
│   │   ├── translationService.js  # TTS (Text-to-Speech) & API dịch
│   │   └── summaryService.js      # Tạo tóm tắt & Xuất PDF/TXT/DOCX
│   │
│   ├── store/
│   │   └── meetingStore.js        # Quản lý trạng thái toàn cục bằng Zustand
│   │
│   ├── data/
│   │   └── languages.js           # Danh mục ngôn ngữ hỗ trợ & Thể loại câu
│   │
│   ├── App.jsx                    # Header điều hướng & Layout chính
│   ├── main.jsx                   # Entry point React
│   └── index.css                  # Tailwind styles & hiệu ứng giao diện
│
├── server/
│   ├── server.js                  # Express HTTP & WebSocket Server
│   ├── realtime.js                # Quản lý luồng WebSocket thời gian thực
│   ├── transcription.js           # OpenAI Whisper Audio STT
│   ├── translation.js             # Dịch thuật & Phân loại câu nói AI
│   └── summary.js                 # Tổng hợp tóm tắt & Action items AI
│
├── .env.example                   # Mẫu cấu hình môi trường
├── package.json                   # Dependencies & Scripts
├── tailwind.config.js             # Cấu hình Tailwind CSS
├── vite.config.js                 # Cấu hình Vite & Proxy
└── README.md                      # Tài liệu hướng dẫn
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cài đặt các gói phụ thuộc (Dependencies)
Mở terminal tại thư mục dự án và chạy:
```bash
npm install
```

### 2. Cấu hình biến môi trường (Tùy chọn)
Tạo file `.env` tại thư mục gốc (tham khảo từ `.env.example`):
```env
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_TRANSCRIPTION_MODEL=whisper-1
OPENAI_CHAT_MODEL=gpt-4o-mini
```
> *Lưu ý*: Bạn cũng có thể nhập API Key trực tiếp trên giao diện người dùng qua nút **⚙ Settings** ở góc trên bên phải mà không bắt buộc phải tạo file `.env`.

### 3. Khởi chạy ứng dụng
Chạy cả Frontend và Backend cùng lúc:
```bash
npm run dev:all
```
Hoặc chạy riêng biệt:
- **Frontend** (Vite):
  ```bash
  npm run dev
  ```
  *(Truy cập: `http://localhost:5173`)*
- **Backend** (Node.js Express + WebSocket):
  ```bash
  npm run server
  ```
  *(Chạy tại: `http://localhost:3001`)*

---

## 💡 Chế Độ Mô Phỏng Demo (Demo Simulation Mode)

Nếu bạn chưa có sẵn microphone hoặc muốn kiểm tra thử toàn bộ giao diện và chu trình phiên dịch mà không cần chi phí API:
1. Nhấn nút **"Chạy Demo thử nghiệm"** ngay tại màn hình chính hoặc phòng họp.
2. Hệ thống sẽ tự động kích hoạt sóng âm, mô phỏng người nói tiếng Anh & tiếng Việt, phụ đề 2 dòng trực tiếp, tự động gán nhãn thể loại câu (Idea 💡, Problem ⚠️, Action 📌, Decision ✅) và tạo ngay biên bản tóm tắt cuộc họp!
