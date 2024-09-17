import React, { useState, useEffect } from "react";
import { Typography, List, Avatar, Input } from "antd";
import { getDomainFromUrl } from "../utils";

const { Title } = Typography;
const { Search } = Input;

const titleStyle = {
  display: "-webkit-box",
  WebkitLineClamp: "2",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const descriptionStyle = {
  color: "gray",
  fontSize: "14px",
  fontFamily: "segoe UI",
};

const SearchBox = React.memo(({ handleOnSearch, handleSearchBoxOnChange }) => (
  <Search
    placeholder="Perform semantic similarity search"
    onSearch={(value) => handleOnSearch(value)}
    onChange={handleSearchBoxOnChange}
    enterButton
  />
));

const SearchResultList = React.memo(({ dataSource, handleItemClick }) => (
  <div className="scrollable-list-container scrollable-container">
    <List
      itemLayout="horizontal"
      dataSource={dataSource}
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
              <span style={descriptionStyle}>{getDomainFromUrl(item.url)}</span>
            }
          />
        </List.Item>
      )}
    />
  </div>
));

export const SearchSection = ({
  searchResults,
  dataState,
  handleItemClick,
  handleOnSearch,
}) => {
  const [dataSource, setDataSource] = useState([]);

  // Set initial data source
  // Set data source to initial data state when data state changes
  useEffect(() => {
    setDataSource(
      dataState
        .filter((item) => item.title && item.url)
        .sort((a, b) => b.lastVisitTime - a.lastVisitTime)
    );
  }, [dataState]);

  // Set data source to search results when searching
  useEffect(() => {
    setDataSource(searchResults.filter((item) => item.title && item.url));
  }, [searchResults]);

  // Set data source to initial data state when search box is empty
  const handleSearchBoxOnChange = (e) => {
    if (e.target.value === "") {
      setDataSource(dataState.filter((item) => item.title && item.url));
    }
  };

  return (
    <div className="section result-section">
      <Title level={5} style={{ marginBottom: "0.375rem" }}>
        ✨ Search your history
        {/* <Spin className="spin" indicator={<LoadingOutlined spin />} /> */}
      </Title>
      <SearchBox
        handleOnSearch={handleOnSearch}
        handleSearchBoxOnChange={handleSearchBoxOnChange}
      />
      <SearchResultList
        dataSource={dataSource}
        handleItemClick={handleItemClick}
      />
    </div>
  );
};
