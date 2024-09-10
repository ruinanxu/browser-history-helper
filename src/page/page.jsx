import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Tabs } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import './page.css';

const { TabPane } = Tabs;

function HistoryPage() {
  const [visitData, setVisitData] = useState([]);

  useEffect(() => {
    chrome.history.search({ text: '', maxResults: 1000 }, (historyItems) => {
      const visits = historyItems.map(item => ({
        url: item.url,
        visitTime: new Date(item.lastVisitTime)
      }));
      setVisitData(visits);
    });
  }, []);

  const processData = (data, type) => {
    const result = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const timeLabels = ["12AM", "2AM", "4AM", "6AM", "8AM", "10AM", "12PM", "2PM", "4PM", "6PM", "8PM", "10PM"];
    
    data.forEach(item => {
      let key;
      switch (type) {
        case 'month':
          key = monthNames[item.visitTime.getMonth()];
          break;
        case 'dayOfMonth':
          key = item.visitTime.getDate();
          break;
        case 'dayOfWeek':
          key = dayNames[item.visitTime.getDay()];
          break;
        case 'timeOfDay':
          key = timeLabels[Math.floor(item.visitTime.getHours() / 2)];
          break;
        default:
          key = '';
      }
      if (result[key]) {
        result[key]++;
      } else {
        result[key] = 1;
      }
    });
    return Object.keys(result).map(key => ({ name: key, visits: result[key] }));
  };

  const monthData = processData(visitData, 'month');
  const dayOfMonthData = processData(visitData, 'dayOfMonth');
  const dayOfWeekData = processData(visitData, 'dayOfWeek');
  const timeOfDayData = processData(visitData, 'timeOfDay');

  return (
    <div className="history-page">
      <Tabs tabPosition="left" className="custom-tabs">
        <TabPane tab="History Statistics" key="1">
          <h1>History Statistics</h1>
          <div className="chart-container">
            <h2>Visits by Month</h2>
            <BarChart width={600} height={300} data={monthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visits" fill="#8884d8" />
            </BarChart>
          </div>
          <div className="chart-container">
            <h2>Visits by Day of Month</h2>
            <BarChart width={600} height={300} data={dayOfMonthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visits" fill="#82ca9d" />
            </BarChart>
          </div>
          <div className="chart-container">
            <h2>Visits by Day of Week</h2>
            <BarChart width={600} height={300} data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visits" fill="#ffc658" />
            </BarChart>
          </div>
          <div className="chart-container">
            <h2>Visits by Time of Day</h2>
            <BarChart width={600} height={300} data={timeOfDayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" ticks={["12AM", "2AM", "4AM", "6AM", "8AM", "10AM", "12PM", "2PM", "4PM", "6PM", "8PM", "10PM"]} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visits" fill="#ff7300" />
            </BarChart>
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

const container = document.getElementById('page-root');
const root = createRoot(container);
root.render(<HistoryPage />);