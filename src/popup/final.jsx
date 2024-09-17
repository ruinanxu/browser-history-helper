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
  <div className="scrollable-list-container scrollable-container container-margin">
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

const RecommendResultList = React.memo(({ dataSource, handleItemClick }) => (
  <div className="recommended-container">
    <Title level={5} style={{ margin: "0.375rem 0" }}>
      ❤️ Recommended
    </Title>
    <List
      size="small"
      bordered
      dataSource={dataSource}
      renderItem={(item) => (
        <List.Item onClick={() => handleItemClick(item)}>
          <List.Item.Meta
            avatar={
              <Avatar
                src={`${new URL(item.url).origin}/favicon.ico`}
                shape="square"
                size={20}
              />
            }
            title={
              <a
                href=""
                style={{
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.title}
              </a>
            }
          />
        </List.Item>
      )}
    />
  </div>
));

export const FinalSection = ({
  searchResults,
  recommendResults,
  dataState,
  handleItemClick,
  handleOnSearch,
}) => {
  const [dataSource, setDataSource] = useState([]);

  // Set initial data source
  // Set data source to initial data state when data state changes
  useEffect(() => {
    setDataSource(dataState.sort((a, b) => b.lastVisitTime - a.lastVisitTime));
  }, [dataState]);

  // Set data source to search results when searching
  useEffect(() => {
    setDataSource(searchResults);
  }, [searchResults]);

  // Set data source to initial data state when search box is empty
  const handleSearchBoxOnChange = (e) => {
    if (e.target.value === "") {
      setDataSource(dataState);
    }
  };

  return (
    <div className="section result-section">
      <SearchBox
        handleOnSearch={handleOnSearch}
        handleSearchBoxOnChange={handleSearchBoxOnChange}
      />
      <RecommendResultList
        dataSource={recommendResults.slice(0, 3)}
        handleItemClick={handleItemClick}
      />
      <SearchResultList
        dataSource={dataSource}
        handleItemClick={handleItemClick}
      />
    </div>
  );
};
