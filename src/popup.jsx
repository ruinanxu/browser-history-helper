import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./Popup.css";
import { Typography, ConfigProvider, Menu as AntMenu } from "antd";
import { maxResults } from "./constants.js";
import {
  HistoryOutlined,
  FilterOutlined,
  SettingOutlined,
  IssuesCloseOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { CustomizationSection } from "./customization.jsx";
import { FilterSection } from "./filter.jsx";
import { SearchSection } from "./search.jsx";
import { RecommendSection } from "./recommend.jsx";
import { StatsSection } from "./stats.jsx";
import { updateHistoryItem } from "./utils.js";

const { Title } = Typography;

const sections = [
  {
    label: "Search",
    key: "search",
    icon: <HistoryOutlined />,
  },
  {
    label: "Filter",
    key: "filter",
    icon: <FilterOutlined />,
  },
  {
    label: "Recommend",
    key: "recommend",
    icon: <IssuesCloseOutlined />,
  },
  {
    label: "Stats",
    key: "stats",
    icon: <TableOutlined />,
  }
];

const Menu = ({ current, setCurrent }) => {
  const onClick = useCallback(
    (e) => {
      console.log("click ", e);
      setCurrent(e.key);
    },
    [setCurrent]
  );

  return (
    <AntMenu
      onClick={onClick}
      selectedKeys={[current]}
      mode="horizontal"
      items={sections}
    />
  );
};

function App() {
  const [dataState, setDataState] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagsCountMap, setTagsCountMap] = useState({});
  const [currentTab, setCurrentTab] = useState("search");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [recommendResults, setRecommendResults] = useState([]);

  useEffect(() => {
    const fetchCustomLabels = async () => {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(["tagsCountMap"], resolve);
      });
      setTags(Object.keys(result.tagsCountMap) || []);
      setTagsCountMap(result.tagsCountMap || {});
    };

    fetchCustomLabels();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const loadedData = await handleLoadData();
      setDataState(loadedData);
      setSearchResults(loadedData);
    };

    const handlePopState = () => {
      loadData();
    };

    loadData();

    // Listen for changes in the URL and will reload the data when the History changes
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (currentTab === "recommend") {
      console.log("recommend tab");

      handleOnRecommend();
    }
  }, [currentTab]);

  ////////////////////// Generate new tags button /////////////////////
  //
  // 1. Generate new tags.
  // 2. Load new data.
  const handleButtonClick = useCallback(async () => {
    setLoading(true);
    await handleGenerateTags();
  }, []);

  const handleGenerateTags = useCallback(async () => {
    const historyItems = await new Promise((resolve) => {
      const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      chrome.history.search(
        { text: "", maxResults: maxResults, startTime: oneMonthAgo },
        resolve
      );
    });

    for (const [index, page] of historyItems.entries()) {
      const message = {
        action: "classify",
        text: page.title,
        url: page.url,
      };
      console.log(`------------${index}-------------`);
      console.log("sending message", message);

      const classifyRessult = await new Promise((resolve) => {
        chrome.runtime.sendMessage(message, resolve);
      });

      console.log("2-received classifyRessult", classifyRessult);
      await updateHistoryItem(page, classifyRessult, null);
    }

    setLoading(false);
    // Refresh data
    const loadedData = await handleLoadData();
    setDataState(loadedData);
  }, []);

  const handleLoadData = useCallback(() => {
    console.log("loading data");
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

  /**
   * Handle History item click
   */
  const handleItemClick = useCallback((item) => {
    console.log("item", item);
    chrome.tabs.create({ url: item.url });
  }, []);

  const handleFilterChange = useCallback((newSelectedTags) => {
    setSelectedTags(newSelectedTags);
  }, []);

  const handleOnSearch = useCallback(async (value) => {
    const message = {
      action: "simi-search",
      query: value,
    };
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });

    console.log("received simi-search response", response);
    setSearchResults(response);
  }, []);

  const handleOnRecommend = useCallback(async () => {
    // Get all tabs in the current window
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTabTitle = tab[0].title;

    const message = {
      action: "recommend",
      query: currentTabTitle,
    };

    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });

    console.log("received recommend response", response);

    // Filter out items with the same title as the current tab
    const filteredResponse = response.filter(
      (item) => item.title !== currentTabTitle
    );

    setRecommendResults(filteredResponse);
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          controlHeight: 28,
        },
      }}
    >
      <div className="container">
        <Title
          level={3}
          className="title"
          style={{ marginBottom: "6px", marginTop: "6px" }}
        >
          Browser History Helper
        </Title>
        <Menu current={currentTab} setCurrent={setCurrentTab} />
        {currentTab === "search" && (
          <SearchSection
            searchResults={searchResults}
            dataState={dataState}
            handleItemClick={handleItemClick}
            handleOnSearch={handleOnSearch}
          />
        )}
        {currentTab === "filter" && (
          <FilterSection
            loading={loading}
            selectedTags={selectedTags}
            handleFilterChange={handleFilterChange}
            tags={tags}
            tagsCountMap={tagsCountMap}
            dataState={dataState}
            handleItemClick={handleItemClick}
          />
        )}
        {currentTab === "recommend" && (
          <RecommendSection
            recommendResults={recommendResults}
            handleItemClick={handleItemClick}
          />
        )}
        {currentTab === "stats" && (
          <StatsSection
            tagsCountMap={tagsCountMap}
          />
        )}
      </div>
    </ConfigProvider>
  );
}

const elem = document.getElementById("app-root");
const root = createRoot(elem);
root.render(<App />);
