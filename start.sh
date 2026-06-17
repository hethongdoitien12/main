#!/bin/bash
ROOT=$(pwd)

echo "🚀 Khởi động MT Economy..."

echo "📦 Cài dependencies backend..."
cd "$ROOT/backend" && npm install --silent

echo "📦 Cài dependencies frontend..."
cd "$ROOT/frontend" && npm install --silent

echo "🗄️  Chạy migration database..."
cd "$ROOT/backend" && npm run migrate

echo "🌱 Seed dữ liệu mẫu (nếu chưa có)..."
cd "$ROOT/backend" && npm run seed:auto

echo "⚡ Chạy Backend (port 3001)..."
cd "$ROOT/backend" && npm run dev &

echo "🎨 Chạy Frontend (port 5000)..."
cd "$ROOT/frontend" && npm run dev &

echo "✅ Hệ thống đang chạy!"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:5000"

wait
