// api/points.js (Vercel 专用版)
const CHECKIN_POINTS = {
    'A001': { name: '1号厂房东侧', area: '生产车间', lat: 31.230834, lng: 118.173690, radius: 100 },
        'A002': { name: '安庆工厂', area: '仓储区', lat: 30.5215, lng: 117.0478, radius: 200 },
        'B001': { name: '合肥工厂', area: '危化品区', lat: 31.7608, lng: 117.2027, radius: 200 },
};

export default async function handler(req, res) {
    const points = Object.entries(CHECKIN_POINTS).map(([id, p]) => ({
        id, ...p, items: ['消防设施', '安全通道', '设备状态'], frequency: '每日',
    }));

    res.status(200).json({ success: true, points });
}
