# 📚 Homework Manager

A clean, minimalist, distraction-free weekly homework and personal task manager designed for mobile and desktop, featuring real-time cross-device synchronization.

---

## ⚡ Features

1. **Subjects List (21 Subjects)**:
   - Kelajak soati
   - Ingliz tili
   - Ona tili
   - Adabiyot
   - Kimyo
   - Tarbiya
   - Texnologiya
   - Iqtisodiyot
   - Biologiya
   - Geometriya
   - Rus tili
   - Informatika
   - Fizika
   - O'zbekiston tarixi
   - Geografiya
   - Huquq
   - Algebra
   - Umumjahon tarixi
   - Chizmachilik
   - ⭐ **IT (Qo'shimcha dars)**
   - ⭐ **Matematika (Qo'shimcha dars)**
   *(Physical Education has been excluded as requested).*

2. **Silent Real-Time Sync**:
   - Zero toast notifications or popup noise. Changes are synced instantly between devices (laptop and mobile phone) in the background via WebSockets.
   
3. **Streamlined Workflow**:
   - No unnecessary week-switching buttons. Keep track of your weekly tasks directly.
   - One-click **"Reset week"** button when starting a fresh week.
   - One-click **"Mark all as done"** button.

4. **Custom Tasks**:
   - Personal to-do list for independent projects, competitive programming, or extracurriculars.
   - Filter by All, Pending, and Completed.

5. **Design**:
   - Minimalist, monochrome, Linear/Vercel/Notion-inspired design.
   - Responsive and mobile-first.
   - Light and dark themes.

6. **Ready for GitHub & Vercel**:
   - Pre-configured with `.gitignore` and `vercel.json` for seamless 1-click deployment.

---

## 🚀 Quick Start

### Option 1: Double-click (Windows)
Double-click [`start.bat`](start.bat). It will automatically install packages (if needed), launch the server, and open `http://localhost:9590` in your browser.

### Option 2: Terminal
```bash
cd "C:\Users\User\8-A\Homework manager"
npm install
npm start
```
Default URL: **http://localhost:9590**

---

## 📱 Mobile Sync (Same Local Wi-Fi)
1. Ensure your laptop and phone are connected to the same Wi-Fi.
2. Find your local IP address (e.g. `192.168.0.102`).
3. Open `http://<your-ip>:9590` on your mobile phone's browser.
4. Any checkbox marked on your laptop updates on your phone in real time with zero notification noise.
