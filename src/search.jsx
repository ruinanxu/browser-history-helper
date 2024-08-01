import React from "react";
import { Typography, List, Avatar, Input } from "antd";

const { Title } = Typography;
const { Search } = Input;

const titleStyle = {
  display: "-webkit-box",
  WebkitLineClamp: "2",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const SearchBox = React.memo(({ handleOnSearch }) => (
  <Search
    placeholder="Perform similarity search"
    onSearch={(value) => handleOnSearch(value)}
    enterButton
  />
));

const HistoryItemList = React.memo(({ searchResults, handleItemClick }) => (
  <div className="scrollable-list-container scrollable-container">
    <List
      itemLayout="horizontal"
      dataSource={searchResults}
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
          />
        </List.Item>
      )}
    />
  </div>
));

export const SearchSection = ({
  searchResults,
  handleItemClick,
  handleOnSearch,
}) => {
  return (
    <div className="section result-section">
      <Title level={5} style={{ marginBottom: "0.375rem" }}>
        ✨ Search your history
      </Title>
      <SearchBox handleOnSearch={handleOnSearch} />
      <HistoryItemList
        searchResults={searchResults}
        handleItemClick={handleItemClick}
      />
    </div>
  );
};
