import React from "react";
import { Typography, List, Avatar } from "antd";
import { getDomainFromUrl } from "./utils";

const { Title } = Typography;

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

const SuggestResultList = React.memo(({ dataSource, handleItemClick }) => (
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

export const SuggestSection = ({ suggestResults, handleItemClick }) => (
  <div className="section customize-section">
    <Title level={5} style={{ marginBottom: "0.375rem" }}>
      🌈 Suggest
    </Title>
    <SuggestResultList
      dataSource={suggestResults}
      handleItemClick={handleItemClick}
    />
  </div>
);
