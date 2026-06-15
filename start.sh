#!/bin/bash
ROOT=$(pwd)

echo "🚀 Khởi động XU Economy..."

echo "📦 Cài dependencies backend..."
cd "$ROOT/backend" && npm install --silent

echo "📦 Cài dependencies frontend..."
cd "$ROOT/frontend" && npm install --silent

echo "⚡ Chạy Backend (port 3001)..."
cd "$ROOT/backend" && npm run dev &

echo "🎨 Chạy Frontend (port 5000)..."
cd "$ROOT/frontend" && npm run dev &

echo "✅ Hệ thống đang chạy!"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:5000"
echo ""
echo "💡 Lần đầu chạy: cd backend && npm run migrate && npm run seed"

wait
