export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: '方法不允许' });

    const { point_id, lat, lng, result, description } = req.body;

    const CHECKIN_POINTS = {
        'A001': { name: '1号厂房东侧', lat: 31.2304, lng: 120.6773, radius: 50 },
        'A002': { name: '2号仓库南门', lat: 31.2318, lng: 120.6790, radius: 50 },
        'B001': { name: '化学品存储区入口', lat: 31.2295, lng: 120.6755, radius: 30 },
    };
    const point = CHECKIN_POINTS[point_id];
    if (!point) return res.status(400).json({ success: false, message: '点位不存在' });

    // 计算距离
    const R = 6371000;
    const dLat = (point.lat - lat) * Math.PI / 180;
    const dLng = (point.lng - lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(point.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    if (distance > point.radius) {
        return res.status(403).json({ success: false, message: `位置校验失败！距离 ${distance.toFixed(1)} 米，超出 ${point.radius} 米范围` });
    }
    if (result === '异常' && (!description || description.trim() === '')) {
        return res.status(400).json({ success: false, message: '异常必须填写问题描述' });
    }

    try {
        // 1. 获取 Token
        const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app_id: process.env.FEISHU_APP_ID, app_secret: process.env.FEISHU_APP_SECRET }),
        });
        const tokenData = await tokenRes.json();
        
        // 2. 写入多维表格
        const now = new Date();
        const recordRes = await fetch(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BITABLE_TOKEN}/tables/${process.env.FEISHU_TABLE_ID}/records`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenData.tenant_access_token}` },
                body: JSON.stringify({
                    fields: {
                        '点位名称': point.name,
                        '巡检时间': now.toISOString(),
                        '巡检结果': result,
                        'GPS纬度': lat, 'GPS经度': lng,
                        '距点位距离': Math.round(distance*10)/10,
                        '问题描述': description || '',
                        '处理状态': result === '异常' ? '待处理' : '已解决',
                    },
                }),
            }
        );
        const recordData = await recordRes.json();
        if (recordData.code !== 0) throw new Error(recordData.msg);

        return res.status(200).json({ success: true, message: '打卡成功，数据已存入飞书表格', distance: Math.round(distance*10)/10 });
    } catch (err) {
        return res.status(500).json({ success: false, message: '写入失败: ' + err.message });
    }
}