// /messages

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import styles from './messages.module.css';

const MOCK_CONVERSATIONS = [
  {
    id: '1',
    username: 'Chirag Singla',
    avatarUrl: 'https://i.pravatar.cc/150?img=25',
    lastMessage: '',
    timestamp: '',
    unread: false,
    active: '2h ago',
  },
];

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  const profile = user?.profile;
  const activeConversation = MOCK_CONVERSATIONS.find(c => c.id === selectedConversation);

  return (
    <div className={styles.messagesContainer}>
      <div className={styles.messagesLayout}>
        {/* Conversations List */}
        <div className={styles.conversationsList}>
          <div className={styles.conversationsHeader}>
            <div className={styles.userHeader}>
              <span className={styles.username}>{profile?.username || 'upvox_'}</span>
              <svg width="20" height="20" viewBox="0 0 20 20" style={{transform: 'rotate(180deg)'}}>
                <path d="M3.33 10L10 16.67L16.67 10" stroke="#262626" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <button className={styles.newMessageButton} aria-label="New message">
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.202 3.703H5.25C4.45435 3.703 3.69129 4.01907 3.12868 4.58168C2.56607 5.14429 2.25 5.90735 2.25 6.703V19.25C2.25 20.0457 2.56607 20.8087 3.12868 21.3713C3.69129 21.9339 4.45435 22.25 5.25 22.25H17.797C18.5927 22.25 19.3557 21.9339 19.9183 21.3713C20.4809 20.8087 20.797 20.0457 20.797 19.25V12.298" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10.0019 17.7261H6.77393V14.4981L18.6069 2.66506C18.7385 2.53347 18.8947 2.42909 19.0666 2.35787C19.2386 2.28665 19.4228 2.25 19.6089 2.25C19.795 2.25 19.9793 2.28665 20.1512 2.35787C20.3231 2.42909 20.4793 2.53347 20.6109 2.66506L21.8349 3.89006C21.9665 4.02164 22.0709 4.17785 22.1421 4.34978C22.2133 4.5217 22.25 4.70597 22.25 4.89206C22.25 5.07815 22.2133 5.26242 22.1421 5.43434C22.0709 5.60627 21.9665 5.76248 21.8349 5.89406L10.0019 17.7261Z" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16.8479 4.42395L20.0759 7.65295" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </button>
          </div>

          <div className={styles.tabs}>
            <button className={`${styles.tab} ${styles.tabActive}`}>PRIMARY</button>
            <button className={`${styles.tab} ${styles.tabInactive}`}>GENERAL</button>
          </div>

          <div className={styles.conversationsListItems}>
            {MOCK_CONVERSATIONS.map((conversation) => (
              <button
                key={conversation.id}
                className={`${styles.conversationItem} ${selectedConversation === conversation.id ? styles.conversationItemActive : ''}`}
                onClick={() => setSelectedConversation(conversation.id)}
              >
                <div className={styles.conversationAvatar}>
                  <Image
                    src={conversation.avatarUrl}
                    alt={conversation.username}
                    width={56}
                    height={56}
                    className={styles.avatar}
                    unoptimized
                  />
                </div>
                <div className={styles.conversationInfo}>
                  <span className={styles.conversationUsername}>{conversation.username}</span>
                  <span className={styles.conversationActive}>Active {conversation.active}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Messages View */}
        <div className={styles.messagesView}>
          {!selectedConversation ? (
            /* Empty State - Greeting */
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <div style={{width: 96, height: 96, position: 'relative'}}>
                  <div data-svg-wrapper style={{left: 1, top: 1, position: 'absolute'}}>
                    <svg width="96" height="97" viewBox="0 0 96 97" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M48 95.5C73.9574 95.5 95 74.4574 95 48.5C95 22.5426 73.9574 1.5 48 1.5C22.0426 1.5 1 22.5426 1 48.5C1 74.4574 22.0426 95.5 48 95.5Z" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div data-svg-wrapper style={{left: 41.45, top: 33.21, position: 'absolute'}}>
                    <svg width="30" height="19" viewBox="0 0 30 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M29.2858 1.70996L1.44678 17.304" stroke="#262626" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div data-svg-wrapper style={{left: 24.55, top: 32, position: 'absolute'}}>
                    <svg width="50" height="44" viewBox="0 0 50 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24.2539 42.623L48.3759 1.49805L1.5459 1.50205L18.4479 18.305L24.2539 42.623Z" stroke="#262626" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
              <h2 className={styles.emptyStateTitle}>Your Messages</h2>
              <p className={styles.emptyStateText}>Send private photos and messages to a friend or group.</p>
              <button className={styles.sendMessageButton}>Send Message</button>
            </div>
          ) : (
            <>
              <div className={styles.messagesHeader}>
                <div className={styles.recipientInfo}>
                  <Image
                    src={activeConversation!.avatarUrl}
                    alt={activeConversation!.username}
                    width={24}
                    height={24}
                    className={styles.recipientAvatar}
                    unoptimized
                  />
                  <div className={styles.recipientDetails}>
                    <span className={styles.recipientUsername}>{activeConversation!.username}</span>
                    <span className={styles.activeStatus}>Active {activeConversation!.active}</span>
                  </div>
                </div>
                <div className={styles.headerActions}>
                  <button className={styles.headerButton}>
                    <div className={styles.svgWrapper}>
                      <div className={styles.svgWrapperInner}>
                        <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18.227 23.412C13.314 23.412 8.941 19.785 6.741 17.584C4.486 15.33 0.731004 10.791 0.921004 5.73096C0.953564 4.93158 1.27638 4.17147 1.829 3.59296C2.40763 2.97772 3.031 2.40616 3.694 1.88296C4.13269 1.54769 4.67707 1.38087 5.22828 1.4128C5.77948 1.44473 6.30096 1.67328 6.698 2.05696C8.33698 3.50387 9.59348 5.33297 10.356 7.38196C10.5523 8.02858 10.4839 8.72666 10.166 9.32296L9.711 10.176C9.67927 10.2349 9.66068 10.3 9.65654 10.3668C9.6524 10.4336 9.66279 10.5006 9.687 10.563C10.4554 12.4058 11.9208 13.8704 13.764 14.638C13.8262 14.6626 13.893 14.6732 13.9597 14.669C14.0264 14.6649 14.0914 14.6461 14.15 14.614L15.003 14.159C15.5989 13.841 16.2967 13.7727 16.943 13.969C18.9925 14.7312 20.8219 15.9877 22.269 17.627C22.652 18.0241 22.8802 18.5454 22.9121 19.0962C22.944 19.6471 22.7776 20.1912 22.443 20.63C21.9193 21.2928 21.3478 21.9165 20.733 22.496C20.1547 23.0492 19.3946 23.3728 18.595 23.406C18.4724 23.4102 18.3497 23.4122 18.227 23.412ZM5.083 3.41196C5.02288 3.41086 4.9641 3.42986 4.916 3.46596C4.33452 3.92648 3.78771 4.42918 3.28 4.96996C3.06233 5.19557 2.93435 5.49278 2.92 5.80596C2.759 10.107 6.13 14.146 8.155 16.17C10.18 18.194 14.215 21.573 18.521 21.406C18.8339 21.3918 19.1309 21.2638 19.356 21.046C19.8966 20.5377 20.3993 19.9906 20.86 19.409C20.901 19.3458 20.9188 19.2703 20.9102 19.1955C20.9016 19.1207 20.8673 19.0512 20.813 18.999C19.5951 17.6213 18.0675 16.5523 16.356 15.88C16.2185 15.8401 16.0709 15.8559 15.945 15.924L15.091 16.379C14.7753 16.5485 14.4262 16.6467 14.0684 16.6667C13.7106 16.6868 13.3527 16.6281 13.02 16.495C11.8563 16.014 10.799 15.3082 9.90859 14.418C9.01816 13.5277 8.31215 12.4705 7.831 11.307C7.69801 10.9743 7.63939 10.6165 7.65925 10.2587C7.67912 9.90097 7.77699 9.55189 7.946 9.23596L8.402 8.38096C8.46957 8.25522 8.48501 8.10797 8.445 7.97096C7.77276 6.25933 6.70419 4.73153 5.327 3.51296C5.26125 3.44996 5.17406 3.41423 5.083 3.41296V3.41196Z" fill="#262626"/>
                        </svg>
                      </div>
                    </div>
                  </button>
                  <button className={styles.headerButton}>
                    <div className={styles.svgWrapper}>
                      <div className={styles.svgWrapperInner}>
                        <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14.999 3.5H4C2.34315 3.5 1 4.84315 1 6.5V18.5C1 20.1569 2.34315 21.5 4 21.5H14.999C16.6559 21.5 17.999 20.1569 17.999 18.5V6.5C17.999 4.84315 16.6559 3.5 14.999 3.5Z" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M17.999 9.64605L20.494 7.39005C20.7093 7.19537 20.9765 7.06734 21.2632 7.02151C21.5498 6.97567 21.8436 7.01399 22.1089 7.13181C22.3742 7.24964 22.5996 7.44191 22.7578 7.6853C22.9159 7.9287 23.0001 8.21277 23 8.50305V16.497C23.0001 16.7873 22.9159 17.0714 22.7578 17.3148C22.5996 17.5582 22.3742 17.7505 22.1089 17.8683C21.8436 17.9861 21.5498 18.0244 21.2632 17.9786C20.9765 17.9328 20.7093 17.8047 20.494 17.61L18 15.354" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </button>
                  <button className={styles.headerButton}>
                    <div className={styles.svgWrapper}>
                      <div className={styles.svgWrapperInner}>
                        <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.001 23.005C17.8 23.005 22.501 18.304 22.501 12.505C22.501 6.70602 17.8 2.005 12.001 2.005C6.20199 2.005 1.50098 6.70602 1.50098 12.505C1.50098 18.304 6.20199 23.005 12.001 23.005Z" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M11.8188 9.45898C12.5092 9.45898 13.0688 8.89934 13.0688 8.20898C13.0688 7.51863 12.5092 6.95898 11.8188 6.95898C11.1285 6.95898 10.5688 7.51863 10.5688 8.20898C10.5688 8.89934 11.1285 9.45898 11.8188 9.45898Z" fill="#262626"/>
                          <path d="M10.5688 17.277H13.4318" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M10.5688 11.55H11.9998V17.277" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className={styles.messagesContent}>
                {/* Messages would go here */}
              </div>

              <div className={styles.messageInput}>
                <button className={styles.emojiButton}>
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.83 10.9971C15.5992 10.9971 15.3736 11.0655 15.1817 11.1937C14.9897 11.322 14.8402 11.5042 14.7518 11.7175C14.6635 11.9307 14.6404 12.1653 14.6854 12.3917C14.7305 12.6181 14.8416 12.826 15.0048 12.9892C15.168 13.1525 15.376 13.2636 15.6023 13.3086C15.8287 13.3537 16.0634 13.3305 16.2766 13.2422C16.4898 13.1539 16.6721 13.0043 16.8003 12.8124C16.9286 12.6205 16.997 12.3949 16.997 12.1641C16.997 11.8545 16.8741 11.5577 16.6552 11.3389C16.4363 11.12 16.1395 10.9971 15.83 10.9971ZM9.33 12.1641C9.33 11.9332 9.26154 11.7075 9.13326 11.5156C9.00498 11.3237 8.82267 11.1741 8.60937 11.0858C8.39607 10.9975 8.16137 10.9744 7.93497 11.0195C7.70856 11.0647 7.50063 11.1759 7.33746 11.3392C7.17429 11.5025 7.06322 11.7106 7.01831 11.937C6.97339 12.1634 6.99664 12.3981 7.08512 12.6113C7.17361 12.8246 7.32334 13.0068 7.51538 13.1349C7.70743 13.263 7.93315 13.3312 8.164 13.3311C8.47334 13.3308 8.76991 13.2077 8.98855 12.9889C9.20719 12.7701 9.33 12.4734 9.33 12.1641ZM14.493 15.4041C14.1748 15.7463 13.7896 16.0193 13.3613 16.2063C12.933 16.3932 12.4708 16.49 12.0035 16.4907C11.5362 16.4913 11.0738 16.3958 10.645 16.2101C10.2162 16.0244 9.83018 15.7524 9.511 15.4111C9.34445 15.2046 9.10269 15.0727 8.83892 15.0445C8.57515 15.0163 8.31098 15.094 8.10451 15.2606C7.89803 15.4271 7.76618 15.6689 7.73796 15.9326C7.70974 16.1964 7.78745 16.4606 7.95401 16.6671C8.46045 17.2404 9.083 17.6996 9.78037 18.014C10.4777 18.3285 11.234 18.4912 11.999 18.4912C12.764 18.4912 13.5203 18.3285 14.2176 18.014C14.915 17.6996 15.5376 17.2404 16.044 16.6671C16.204 16.4608 16.2769 16.2001 16.2473 15.9408C16.2177 15.6814 16.0878 15.4439 15.8854 15.279C15.6831 15.1141 15.4243 15.0349 15.1643 15.0583C14.9043 15.0816 14.6637 15.2057 14.494 15.4041H14.493ZM12 0.503052C9.72552 0.503052 7.50211 1.17751 5.61095 2.44115C3.71978 3.70479 2.2458 5.50084 1.37539 7.60219C0.504983 9.70354 0.277244 12.0158 0.720974 14.2466C1.1647 16.4774 2.25997 18.5265 3.86828 20.1348C5.47658 21.7431 7.52568 22.8384 9.75647 23.2821C11.9872 23.7258 14.2995 23.4981 16.4009 22.6277C18.5022 21.7573 20.2983 20.2833 21.5619 18.3921C22.8255 16.5009 23.5 14.2775 23.5 12.0031C23.4966 8.95412 22.2839 6.03105 20.1279 3.87512C17.972 1.7192 15.0489 0.506493 12 0.503052ZM12 21.5031C10.1211 21.5031 8.28435 20.9459 6.72209 19.902C5.15982 18.8581 3.94218 17.3744 3.22315 15.6385C2.50412 13.9026 2.31599 11.9925 2.68255 10.1497C3.0491 8.30687 3.95389 6.61414 5.28249 5.28554C6.61109 3.95694 8.30383 3.05215 10.1466 2.68559C11.9895 2.31903 13.8996 2.50716 15.6355 3.2262C17.3714 3.94523 18.8551 5.16287 19.899 6.72513C20.9428 8.2874 21.5 10.1241 21.5 12.0031C21.4974 14.5218 20.4956 16.9366 18.7146 18.7176C16.9336 20.4987 14.5187 21.5004 12 21.5031Z" fill="#262626"/>
                      </svg>
                    </div>
                  </div>
                </button>
                <input
                  type="text"
                  placeholder="Message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className={styles.messageInputField}
                />
                <button className={styles.iconButton}>
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M6.54919 5.01294C6.24124 5.01294 5.94021 5.10426 5.68417 5.27534C5.42812 5.44643 5.22855 5.6896 5.11071 5.9741C4.99286 6.25861 4.96203 6.57167 5.02211 6.87369C5.08218 7.17572 5.23047 7.45315 5.44822 7.6709C5.66597 7.88865 5.9434 8.03695 6.24543 8.09702C6.54746 8.1571 6.86052 8.12627 7.14503 8.00842C7.42953 7.89057 7.6727 7.69101 7.84379 7.43496C8.01487 7.17892 8.10619 6.87789 8.10619 6.56994C8.10619 6.157 7.94215 5.76097 7.65015 5.46897C7.35816 5.17698 6.96213 5.01294 6.54919 5.01294Z" fill="#262626"/>
                        <path d="M2 18.6049L5.901 14.7049C6.07128 14.5347 6.30221 14.439 6.543 14.439C6.78379 14.439 7.01472 14.5347 7.185 14.7049L9.992 17.5109C10.1622 17.6809 10.393 17.7763 10.6335 17.7763C10.874 17.7763 11.1048 17.6809 11.275 17.5109L16.809 11.9769C16.9792 11.807 17.21 11.7115 17.4505 11.7115C17.691 11.7115 17.9218 11.807 18.092 11.9769L21.997 15.8819" stroke="#262626" strokeWidth="2" strokeLinejoin="round"/>
                        <path d="M18.4398 2.00405C19.384 2.00405 20.2895 2.37912 20.9571 3.04675C21.6247 3.71438 21.9998 4.61988 21.9998 5.56405V18.4371C21.9998 19.3812 21.6247 20.2867 20.9571 20.9544C20.2895 21.622 19.384 21.9971 18.4398 21.9971H5.56781C4.62364 21.9971 3.71814 21.622 3.05051 20.9544C2.38288 20.2867 2.00781 19.3812 2.00781 18.4371V5.56305C2.00781 4.61888 2.38288 3.71338 3.05051 3.04575C3.71814 2.37812 4.62364 2.00305 5.56781 2.00305L18.4398 2.00405Z" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </button>
                <button className={styles.iconButton}>
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.7922 3.90397C18.1066 3.97664 19.339 4.56587 20.2209 5.54328C21.1028 6.52068 21.5626 7.80701 21.5002 9.12197C21.5002 12.194 18.8482 14.081 16.3032 16.344C13.7912 18.587 12.4382 19.813 12.0002 20.096C11.5232 19.787 9.85717 18.273 7.69717 16.344C5.14117 14.072 2.50017 12.167 2.50017 9.12197C2.43773 7.80701 2.89755 6.52068 3.77943 5.54328C4.6613 4.56587 5.89373 3.97664 7.20817 3.90397C7.93631 3.8819 8.65772 4.04915 9.30188 4.38937C9.94603 4.72959 10.4909 5.23113 10.8832 5.84497C11.7232 7.01997 11.8632 7.60797 12.0032 7.60797C12.1432 7.60797 12.2812 7.01997 13.1132 5.84197C13.5032 5.22529 14.0483 4.72176 14.6939 4.38169C15.3395 4.04161 16.063 3.87688 16.7922 3.90397ZM16.7922 1.90397C15.8841 1.8749 14.9812 2.05106 14.1506 2.41932C13.3201 2.78759 12.5833 3.33848 11.9952 4.03097C11.4075 3.3405 10.6723 2.79088 9.84371 2.42272C9.01515 2.05457 8.11445 1.87729 7.20817 1.90397C5.36304 1.97612 3.62155 2.77596 2.36451 4.12857C1.10747 5.48118 0.43716 7.27651 0.500165 9.12197C0.500165 12.732 3.05017 14.949 5.51517 17.092C5.79817 17.338 6.08417 17.586 6.36817 17.839L7.39517 18.757C8.51521 19.8227 9.68943 20.8301 10.9132 21.775C11.2369 21.9846 11.6144 22.0962 12.0002 22.0962C12.3859 22.0962 12.7634 21.9846 13.0872 21.775C14.3499 20.8012 15.5602 19.7614 16.7132 18.66L17.6352 17.836C17.9282 17.576 18.2252 17.317 18.5202 17.062C20.8542 15.037 23.5002 12.742 23.5002 9.12197C23.5632 7.27651 22.8929 5.48118 21.6358 4.12857C20.3788 2.77596 18.6373 1.97612 16.7922 1.90397Z" fill="#262626"/>
                      </svg>
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
