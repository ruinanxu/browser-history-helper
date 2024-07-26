import React, { useState, useRef, useEffect } from "react";
import { Input, Tag, Typography, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { TweenOneGroup } from "rc-tween-one";
import { theme } from "antd";

const { Title } = Typography;

const Customization = ({ tags, setTags }) => {
  const { token } = theme.useToken();
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputVisible) {
      inputRef.current?.focus();
    }
  }, [inputVisible]);

  const handleClose = (removedTag) => {
    setTags(tags.filter((tag) => tag !== removedTag));
  };

  const showInput = () => {
    setInputVisible(true);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputConfirm = () => {
    if (inputValue && tags.indexOf(inputValue) === -1) {
      setTags([...tags, inputValue]);
    }
    setInputVisible(false);
    setInputValue("");
  };

  const forMap = (tag) => (
    <span key={tag} style={{ display: "inline-block" }}>
      <Tag
        closable
        onClose={(e) => {
          e.preventDefault();
          handleClose(tag);
        }}
      >
        {tag}
      </Tag>
    </span>
  );

  const tagPlusStyle = {
    background: token.colorBgContainer,
    borderStyle: "dashed",
  };

  return (
    <>
      <div className="scrollable-tags-container scrollable-container">
        <TweenOneGroup
          appear={false}
          enter={{ scale: 0.8, opacity: 0, type: "from", duration: 100 }}
          leave={{ opacity: 0, width: 0, scale: 0, duration: 200 }}
          onEnd={(e) => {
            if (e.type === "appear" || e.type === "enter") {
              e.target.style = "display: inline-block";
            }
          }}
        >
          {tags ? tags.map(forMap) : []}
        </TweenOneGroup>
      </div>
      {inputVisible ? (
        <Input
          ref={inputRef}
          type="text"
          size="small"
          style={{ width: 78 }}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputConfirm}
          onPressEnter={handleInputConfirm}
        />
      ) : (
        <Tag onClick={showInput} style={tagPlusStyle}>
          <PlusOutlined /> New Tag
        </Tag>
      )}
    </>
  );
};

export const CustomizationSection = ({ tags, setTags, handleGenerateTags }) => (
  <div className="section customize-section">
    <Title level={5} style={{ marginBottom: "0.375rem" }}>
      ✨ Customize your tags
    </Title>
    <Customization tags={tags} setTags={setTags} />
    <Button type="primary" className="btn" onClick={handleGenerateTags}>
      Save and Generate tags
    </Button>
  </div>
);
