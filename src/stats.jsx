import React from 'react';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Typography } from "antd";

const { Title } = Typography;

const PieChartArea = ({ tagsCountMap }) => {
  const data = Object.keys(tagsCountMap)
    .filter(tag => tagsCountMap[tag] > 4)
    .map(tag => ({
      name: tag,
      value: tagsCountMap[tag],
    }))
    .sort((a, b) => a.value - b.value);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF6384', '#36A2EB', '#FFCE56'];

  return (
    <div>
      <Title level={5} style={{ marginBottom: "0.375rem" }}>
        All Tags Pie Chart
      </Title>
      <PieChart width={180} height={180}>
        <Pie
          data={data}
          cx={90}
          cy={90}
          labelLine={false}
          outerRadius={80}
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
    .map(tag => ({
      name: tag,
      value: tagsCountMap[tag],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div>
      <Title level={5} style={{ marginBottom: "0.375rem" }}>
        Top 10 Tags by Count
      </Title>
      <BarChart width={180} height={180} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#2169EB" />
      </BarChart>
    </div>
  );
};

export const StatsSection = ({ tagsCountMap }) => {
  return (
    <div className="section result-section">
      <Title level={5} style={{ marginBottom: "0.375rem" }}>
        📈 Statistics
      </Title>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <PieChartArea tagsCountMap={tagsCountMap} />
        <BarChartArea tagsCountMap={tagsCountMap} />
      </div>
    </div>
  );
};