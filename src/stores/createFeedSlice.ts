import { StateCreator } from "zustand";
import { Channel, FeedResItem } from "@/db";
import * as dataAgent from "@/helpers/dataAgent";

export type CollectionMeta = {
  total: { unread: number };
  today: { unread: number };
};

export interface FeedSlice {
  viewMeta: {
    title: string;
    unread: number;
    isToday: boolean;
    isAll: boolean;
  };

  unreadCount: {
    [key: string]: number;
  };

  updateUnreadCount: (uuid: string, action: string, count: number) => void;

  initCollectionMetas: () => void;
  collectionMeta: CollectionMeta;
  updateCollectionMeta: (c: number, n: number) => void;

  setViewMeta: (meta: any) => void;

  feed: FeedResItem | null;
  setFeed: (feed: FeedResItem | null) => void;
  updateFeed: (uuid: string, updater: any) => void;
  feedList: FeedResItem[];
  getFeedList: () => any;

  feedContextMenuTarget: FeedResItem | null;
  setFeedContextMenuTarget: (target: FeedResItem | null) => void;
  feedContextMenuStatus: boolean;
  setFeedContextMenuStatus: (status: boolean) => void;
}

export const createFeedSlice: StateCreator<FeedSlice> = (
  set,
  get,
  ...args
) => ({
  viewMeta: {
    title: "",
    unread: 0,
    isToday: false,
    isAll: false,
  },

  unreadCount: {},

  updateUnreadCount: (uuid: string, action: string, count: number) => {
    const strategy = (action: string, target: any) => {
      switch (action) {
        case "increase": {
          target ? (target.unread += count) : null;
          break;
        }
        case "decrease": {
          target ? (target.unread -= count) : null;
          break;
        }
        case "upgrade": {
          // TODO
          break;
        }

        case "set": {
          target ? (target.unread = count) : null;
          break;
        }
        default: {
          // TODO
        }
      }
    };

    let list = get().feedList.map((feed) => {
      let target: any = feed.uuid === uuid ? feed : null;
      let child: any = feed.children.find((item) => item.uuid === uuid) || null;

      if (child) {
        target = feed;
      }

      if (!(target || child)) {
        return feed;
      }

      strategy(action, target);
      strategy(action, child);

      feed.unread = Math.max(0, feed.unread);

      return feed;
    });

    console.log("%c Line:102 🍢 list", "color:#ea7e5c", list);

    set({
      feedList: list,
    });
  },

  collectionMeta: {
    total: { unread: 0 },
    today: { unread: 0 },
  },

  initCollectionMetas() {
    dataAgent.getCollectionMetas().then(({ data }) => {
      set(() => ({
        collectionMeta: {
          today: { unread: data.today },
          total: { unread: data.total },
        },
      }));
    });
  },

  updateCollectionMeta(today: number, total: number) {
    set(() => ({
      collectionMeta: {
        today: { unread: get().collectionMeta.today.unread + today },
        total: { unread: get().collectionMeta.total.unread + total },
      },
    }));
  },

  setViewMeta(meta) {
    set(() => ({
      viewMeta: meta,
    }));
  },

  feed: null,
  setFeed: (feed: FeedResItem | null) => {
    set(() => ({
      feed: feed,
    }));

    if (feed) {
      set(() => ({
        viewMeta: {
          title: feed.title,
          unread: feed.unread,
          isToday: false,
          isAll: false,
        },
      }));
    }
  },
  feedList: [],
  updateFeed: (uuid: string, updater: any) => {
    set((state) => ({
      feedList: state.feedList.map((feed) => {
        return feed.uuid === uuid
          ? {
              ...feed,
              ...updater,
            }
          : feed;
      }),
    }));
  },
  getFeedList: () => {
    const initUnreadCount = (
      list: any[],
      countCache: { [key: string]: number }
    ) => {
      return list.map((item) => {
        item.unread = countCache[item.uuid] || 0;

        if (item.children) {
          item.children = initUnreadCount(item.children, countCache);
          item.children.forEach((child: FeedResItem) => {
            child.folder_uuid = item.uuid;
            item.unread += child.unread;
          });
        }

        return item;
      });
    };
    return Promise.all([dataAgent.getFeeds(), dataAgent.getUnreadTotal()]).then(
      ([{ data: feedList }, unreadTotal]) => {
        console.log("%c Line:188 🍡 unreadTotal", "color:#4fff4B", unreadTotal);
        console.log("%c Line:185 🍺 feedList", "color:#7f2b82", feedList);
        feedList = initUnreadCount(feedList, unreadTotal);
        console.log("%c Line:191 🥐 feedList", "color:#2eafb0", feedList);
        set(() => ({
          feedList: feedList || [],
        }));
      }
    );
  },

  feedContextMenuTarget: null,
  setFeedContextMenuTarget: (target: Channel | null) => {
    set(() => ({
      feedContextMenuTarget: target,
    }));
  },
  feedContextMenuStatus: false,
  setFeedContextMenuStatus(status) {
    set(() => ({
      feedContextMenuStatus: status,
    }));
  },
});
