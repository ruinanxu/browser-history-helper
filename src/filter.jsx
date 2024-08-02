import React from "react";
import { Typography, Select, List, Avatar, Tag, Tooltip } from "antd";

const { Title } = Typography;

const titleStyle = {
  display: "-webkit-box",
  WebkitLineClamp: "2",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const Filter = React.memo(({ selectedTags, handleFilterChange, options }) => (
  <Select
    mode="multiple"
    style={{ width: "100%" }}
    placeholder="Filter with tags"
    onChange={handleFilterChange}
    value={selectedTags}
    options={options.filter((label) => !selectedTags.includes(label.value))}
  />
));

const FilteredHistoryList = React.memo(({ dataState, handleItemClick }) => (
  <div className="scrollable-list-container scrollable-container">
    <List
      itemLayout="horizontal"
      dataSource={dataState}
      renderItem={(item) => (
        <List.Item onClick={() => handleItemClick(item)}>
          <List.Item.Meta
            avatar={
              <Avatar
                src={`${new URL(item.url).origin}/favicon.ico`}
                shape="square"
              />
            }
            title={
              <a href="" style={titleStyle}>
                {item.title}
              </a>
            }
            description={
              item.tags?.map((tag, index) => (
                <Tooltip key={tag} title={item.scores[index]}>
                  <Tag>{tag}</Tag>
                </Tooltip>
              )) || []
            }
          />
        </List.Item>
      )}
    />
  </div>
));

export const FilterSection = ({
  selectedTags,
  handleFilterChange,
  tags,
  dataState,
  handleItemClick,
}) => {
  // Only show items that have all selected tags
  const filteredData = dataState
    .filter((item) => selectedTags.every((tag) => item.tags.includes(tag)))
    .sort((a, b) => b.lastVisitTime - a.lastVisitTime);

  return (
    <div className="section result-section">
      <Title level={5} style={{ marginBottom: "0.375rem" }}>
        🪄 Filter your history
      </Title>
      <Filter
        selectedTags={selectedTags}
        handleFilterChange={handleFilterChange}
        options={tags.map((label) => ({ value: label, label }))}
      />
      <FilteredHistoryList
        dataState={filteredData}
        handleItemClick={handleItemClick}
      />
    </div>
  );
};
