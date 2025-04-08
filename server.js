const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;
require('dotenv').config();

// URL ของ Drone Config Server
const droneConfigUrl = process.env.DRONE_CONFIG_URL;
const droneId = process.env.DRONE_ID;

// const droneConfigUrl = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLhbYwXOOUeKJnEz4SGmtsegDyTniQ6ghQPMrf2Nbijfsv7g6VzKaU9ljkUmS6jpePXdMdkofBj2oah0M_kKAs_QzJe5Oh1sP57zQ4Z0Ha-8HI8pw1buB_F0lbeLFLotTTL2uF0ut2ckYN3B5JCxftv8Dbefn56-KzdGLZWevzUnVbD4aVraZbHe8jOTRhcms5D5IbnrXNLn5V7efUYQeckwP6yqSO4VHywLKVXNa5Ibta4CBisbceUoDGnzIvZm6gxR0YJUNk8IOaLozTulWN8p9ELrhe9Apep9V5iP&lib=M9_yccKOaZVEQaYjEvK1gClQlFAuFWsxN';

const droneLogUrl = 'https://app-tracking.pockethost.io/api/collections/drone_logs/records';
const token = "20250301efx"

// ใช้ CORS เพื่ออนุญาตให้ Frontend ติดต่อกับ Backend ได้
const cors = require('cors');
app.use(cors()); 

app.use(express.json());

// เส้นทาง root ของ API
app.get('/', (req, res) => {
    res.send('Welcome to the Drone API Server!');
});

// API สำหรับส่งค่า droneId ไปยัง Frontend
app.get('/get-drone-id', (req, res) => {
  res.json({ droneId });
});

app.get('/configs', async (req, res) => {
  try {
    const response = await axios.get(droneConfigUrl);
    console.log("Response Data:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}); 

// API Endpoint สำหรับดึงข้อมูล Drone Config
app.get('/configs/:droneId', async (req, res) => {
    try {
        // รับค่า droneId จากพารามิเตอร์ใน URL
        const droneId = req.params.droneId;

        // ส่งคำขอไปยัง Drone Config Server พร้อมกับพารามิเตอร์ drone_id
        const response = await axios.get(`${droneConfigUrl}&drone_id=${droneId}`);  // ส่ง drone_id เป็น query parameter

        // ตรวจสอบข้อมูลที่ได้รับจาก API
        console.log("Response Data:", response.data);

        // กรองข้อมูลจาก response.data.data ที่มี drone_id ตรงกับ droneId
        const droneData = response.data.data.filter(drone => drone.drone_id === parseInt(droneId));

        // ถ้าพบข้อมูล
        if (droneData.length > 0) {
            // สร้าง object ที่มีข้อมูลเฉพาะที่ต้องการ
            const filteredData = {
                drone_id: droneData[0].drone_id,
                drone_name: droneData[0].drone_name,
                light: droneData[0].light,
                country: droneData[0].country,
                weight: droneData[0].weight
            };

            //แสดงแค่ที่ใช้
            console.log("configs:", filteredData);
            // ส่งข้อมูลที่กรองแล้วกลับไป
            res.json(filteredData);
        } else {
            // ถ้าไม่พบข้อมูลที่ตรงกับ droneId
            res.status(404).send('No config data found for the specified drone ID.');
        }
    } catch (error) {
        console.error('Error details:', error.response ? error.response.data : error.message);
        
        // ส่งข้อความผิดพลาดและสถานะ
        res.status(error.response ? error.response.status : 500).send('Error: ' + (error.response ? error.response.statusText : error.message));
    }
});

app.get('/status/:droneId', async (req, res) => {
    try {
        // รับค่า droneId จากพารามิเตอร์ใน URL
        const droneId = req.params.droneId;

        // ส่งคำขอไปยัง Drone Config Server พร้อมกับพารามิเตอร์ drone_id
        const response = await axios.get(`${droneConfigUrl}&drone_id=${droneId}`);  // ส่ง drone_id เป็น query parameter

        console.log("Response Data:", response.data);
        
        const droneData = response.data.data.filter(drone => drone.drone_id === parseInt(droneId));

        if (droneData.length > 0) {
            
            const filteredData = {
                condition: droneData[0].condition,
            };

            console.log("status:", filteredData);
            res.json(filteredData);
        } else {
            // ถ้าไม่พบข้อมูลที่ตรงกับ droneId
            res.status(404).send('No config data found for the specified drone ID.');
        }
    } catch (error) {
        console.error('Error details:', error.response ? error.response.data : error.message);
        
        // ส่งข้อความผิดพลาดและสถานะ
        res.status(error.response ? error.response.status : 500).send('Error: ' + (error.response ? error.response.statusText : error.message));
    }
});

// ฟังก์ชันดึง log ของ drone ตาม drone_id
async function fetchDroneLogsById(droneId) {
  const url = `${droneLogUrl}?filter=drone_id="${droneId}"&sort=-created&perPage=25`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
        
    const data = response.data;

    if (!data.items || !Array.isArray(data.items)) {
      throw new Error("Invalid data format: 'items' not found or not an array");
    }

    // Map เอาเฉพาะ field ที่ต้องการ
    const filteredLogs = data.items.map((log) => ({
      drone_id: log.drone_id,
      drone_name: log.drone_name,
      created: log.created,
      country: log.country,
      celsius: log.celsius,
    }));

    return filteredLogs;
  } catch (error) {
    console.error("Error fetching drone logs:", error.message);
    throw new Error("Failed to fetch drone logs");
  }
}

//  แบบที่ใช้ query parameter: /logs?droneId=xxx
app.get("/logs", async (req, res) => {
  const droneId = req.query.droneId;

  if (!droneId) {
    return res.status(400).json({ message: "Drone ID is required" });
  }

  try {
    const logs = await fetchDroneLogsById(droneId);

    if (logs.length === 0) {
      return res.status(404).json({ message: "No logs found for the specified drone." });
    }

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching drone logs", error: error.message });
  }
});

// API Endpoint สำหรับดึงข้อมูล Drone logs
app.get("/logs/:droneId", async (req, res) => {
  const { droneId } = req.params;

  if (!droneId) {
    return res.status(400).json({ message: "Drone ID is required" });
  }

  try {
    const logs = await fetchDroneLogsById(droneId);

    if (logs.length === 0) {
      return res.status(404).json({ message: "No logs found for the specified drone." });
    }

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching drone logs", error: error.message });
  }
});

// POST /logs เพื่อส่งข้อมูลไปยัง Drone Log Server
app.post("/logs", async (req, res) => {
  const { drone_id, drone_name, country, celsius } = req.body;

  if (!drone_id || !drone_name || !country || celsius === undefined) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const response = await axios.post(
      droneLogUrl,
      {
        drone_id,
        drone_name,
        country,
        celsius,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(201).json({ message: "Log created successfully", data: response.data });
  } catch (error) {
    console.error("Error creating log:", error.message);
    res.status(500).json({ message: "Failed to create log", error: error.message });
  }
});


// เริ่มต้นเซิร์ฟเวอร์
app.listen(port, () => {
    console.log(`API Server is running on http://localhost:${port}`);
});
