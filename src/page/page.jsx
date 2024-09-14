import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { Tabs } from "antd";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Line,
  LineChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import "./page.css";

const { TabPane } = Tabs;

const PieChartArea = ({ tagsCountMap }) => {
  const data = Object.keys(tagsCountMap)
    .filter((tag) => tagsCountMap[tag] > 4)
    .map((tag) => ({
      name: tag,
      value: tagsCountMap[tag],
    }))
    .sort((a, b) => a.value - b.value);

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
  ];

  return (
    <div>
      <h2>All Tags Pie Chart</h2>
      <PieChart width={600} height={300}>
        <Pie
          data={data}
          cx={360}
          cy={150}
          labelLine={false}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </div>
  );
};

const BarChartArea = ({ tagsCountMap }) => {
  const data = Object.keys(tagsCountMap)
    .map((tag) => ({
      name: tag,
      value: tagsCountMap[tag],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div>
      <h2>Top 10 Tags by Count</h2>
      <BarChart width={600} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#2169EB" />
      </BarChart>
    </div>
  );
};

const LineChartArea = ({ tagsCountMap }) => {
  const data = Object.keys(tagsCountMap)
    .map((tag) => ({
      name: tag,
      value: tagsCountMap[tag],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <h2>Tags Line Chart</h2>
      <LineChart width={600} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
      </LineChart>
    </div>
  );
};

function HistoryPage() {
  const [visitData, setVisitData] = useState([]);
  const [tagsCountMap, setTagsCountMap] = useState({});

  const handleLoadData = useCallback(() => {
    return new Promise((resolve) => {
      chrome.storage.local.get("data", (result) => {
        const items = result.data || {};
        const parsedData = Object.entries(items).map(([_, value]) => {
          try {
            return JSON.parse(value);
          } catch (e) {
            return value;
          }
        });
        resolve(parsedData);
      });
    });
  }, []);

  useEffect(() => {
    handleLoadData().then((storageData) => {
      const visits = storageData.map((item) => ({
        url: item.url,
        visitTime: new Date(item.lastVisitTime),
      }));
      setVisitData(visits);
    });
  }, [handleLoadData]);

  useEffect(() => {
    const fetchTagsMap = async () => {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(["tagsCountMap"], resolve);
      });
      setTagsCountMap(result.tagsCountMap || {});
    };

    fetchTagsMap();
  }, []);

  const processData = (data, type) => {
    const result = {};
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const timeLabels = [
      "12AM",
      "2AM",
      "4AM",
      "6AM",
      "8AM",
      "10AM",
      "12PM",
      "2PM",
      "4PM",
      "6PM",
      "8PM",
      "10PM",
    ];

    data.forEach((item) => {
      let key;
      switch (type) {
        case "month":
          key = monthNames[item.visitTime.getMonth()];
          break;
        case "dayOfMonth":
          key = item.visitTime.getDate();
          break;
        case "dayOfWeek":
          key = dayNames[item.visitTime.getDay()];
          break;
        case "timeOfDay":
          key = timeLabels[Math.floor(item.visitTime.getHours() / 2)];
          break;
        default:
          key = "";
      }
      if (result[key]) {
        result[key]++;
      } else {
        result[key] = 1;
      }
    });
    return Object.entries(result).map(([label, value]) => ({ label, value }));
  };

  const monthData = processData(visitData, "month");
  const dayOfMonthData = processData(visitData, "dayOfMonth");
  const dayOfWeekData = processData(visitData, "dayOfWeek");
  const timeOfDayData = processData(visitData, "timeOfDay");

  return (
    <div className="history-page">
      <Tabs tabPosition="left" className="custom-tabs">
        <TabPane tab="History Statistics" key="1">
          <h1>History Statistics</h1>
          <div className="grid-container">
            <div className="chart-container chart-item">
              <h2>Visits by Time of Day</h2>
              <BarChart width={600} height={300} data={timeOfDayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  ticks={[
                    "12AM",
                    "2AM",
                    "4AM",
                    "6AM",
                    "8AM",
                    "10AM",
                    "12PM",
                    "2PM",
                    "4PM",
                    "6PM",
                    "8PM",
                    "10PM",
                  ]}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#ff7300" />
              </BarChart>
            </div>
            <div className="chart-container chart-item">
              <h2>Visits by Day of Week</h2>
              <BarChart width={600} height={300} data={dayOfWeekData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#ffc658" />
              </BarChart>
            </div>
            <div className="chart-container chart-item">
              <h2>Visits by Day of Month</h2>
              <BarChart width={600} height={300} data={dayOfMonthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </div>
            <div className="chart-container chart-item">
              <h2>Visits by Month</h2>
              <BarChart width={600} height={300} data={monthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </div>
            <div className="chart-container tag-pie-chart">
              <PieChartArea tagsCountMap={tagsCountMap} />
            </div>
            <div className="chart-container tag-bar-charts">
              <BarChartArea tagsCountMap={tagsCountMap} />
            </div>
            <div className="chart-container tag-line-charts">
              <LineChartArea tagsCountMap={tagsCountMap} />
            </div>
          </div>
        </TabPane>
        <TabPane tab="History Deletion" key="2">
          <h1>History Deletion</h1>
          <p>Content for History Deletion.</p>
        </TabPane>
      </Tabs>
    </div>
  );
}

const container = document.getElementById("page-root");
if (container) {
  const root = createRoot(container);
  root.render(<HistoryPage />);
} else {
  console.error("page-root element not found");
}
