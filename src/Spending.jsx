import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { supabase } from "./supabase";
import { isTauri } from "./platform";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./Spending.css";

const exchangeRates = {
  VND: 1,
  USD: 25400,
  EUR: 27200,
  JPY: 162,
  KRW: 18.5,
};

export default function Spending({ session }) {
  const [amount, setAmount] = useState("");
  const [productName, setProductName] = useState("");
  const [isPastDate, setIsPastDate] = useState(false);
  const [dateOverride, setDateOverride] = useState(null); // Now stores Date object
  const [currency, setCurrency] = useState(() => localStorage.getItem("spend-currency") || "VND");
  const [aggregates, setAggregates] = useState({ daily: 0, weekly: 0, monthly: 0 });
  const [history, setHistory] = useState([]);
  const amountRef = useRef(null);
  const datePickerRef = useRef(null);
  const [timeInput, setTimeInput] = useState("12:00");
  const [isEditingTime, setIsEditingTime] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
    // Only focus once on initial mount
    if (amountRef.current) amountRef.current.focus();
  }, []); // Run only once on mount

  useEffect(() => {
    // --- REAL-TIME SYNC ---
    let spendChannel;
    if (session) {
      spendChannel = supabase
        .channel('spend_logs_realtime')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'spend_logs' 
        }, (payload) => {
          // Only re-fetch if the change didn't come from this session's local UI to prevent loops
          fetchData();
        })
        .subscribe();
    }

    return () => {
      if (spendChannel) supabase.removeChannel(spendChannel);
    };
  }, [session]);

  const fetchData = async () => {
    // 1. Fetch Local Data FIRST (Instant)
    try {
      if (isTauri) {
        const localAgg = await invoke("get_spend_aggregates");
        const localLogs = await invoke("get_spend_logs");
        setAggregates(localAgg);
        setHistory(localLogs);
      }
    } catch (err) {
      console.error("Local fetch failed", err);
    }

    // 2. Fetch Cloud Data in BACKGROUND
    if (!session) return;
    
    try {
      const { data: cloudLogs, error } = await supabase
        .from('spend_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (!error && cloudLogs) {
        // Re-run deduplication with new cloud data
        const currentLocal = isTauri ? await invoke("get_spend_logs") : [];
        const combined = [...currentLocal, ...cloudLogs];
        const uniqueMap = new Map();

        combined.forEach(l => {
          // Normalize timestamp to seconds to handle precision differences
          const d = new Date(l.timestamp);
          const normalizedTime = Math.floor(d.getTime() / 1000); 
          const contentKey = `${l.product_name}-${l.amount}-${normalizedTime}`;
          
          if (!uniqueMap.has(l.id) && !uniqueMap.has(contentKey)) {
            uniqueMap.set(l.id || contentKey, l);
          }
        });

        const unique = Array.from(uniqueMap.values());
        const sorted = unique.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Update UI with merged data
        setHistory(sorted);

        // Recalculate totals
        const now = new Date();
        const dailyTotal = sorted
          .filter(l => new Date(l.timestamp).toDateString() === now.toDateString())
          .reduce((sum, l) => sum + l.amount, 0);
        
        setAggregates(prev => ({ ...prev, daily: dailyTotal }));
      }
    } catch (err) {
      console.error("Cloud sync failed", err);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!amount || !productName) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Số tiền phải là số dương");
      return;
    }

    try {
      let timestamp_override = null;
      if (isPastDate && dateOverride) {
        timestamp_override = dateOverride.toISOString();
      }
      
      // Convert to base currency (VND) before saving
      const amountInBase = parsedAmount * (exchangeRates[currency] || 1);
      
      // Save Local
      if (isTauri) {
        await invoke("add_spend_log", { amount: amountInBase, productName, timestampOverride: timestamp_override });
      }

      // Save Cloud
      if (session) {
        await supabase.from('spend_logs').insert({
          user_id: session.user.id,
          amount: amountInBase,
          product_name: productName,
          timestamp: timestamp_override || new Date().toISOString()
        });
      }

      setAmount("");
      setProductName("");
      fetchData();
      if (amountRef.current) amountRef.current.focus();
    } catch (err) {
      console.error("Failed to add spend log", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  const handleCurrencyChange = (e) => {
    const newCurr = e.target.value;
    setCurrency(newCurr);
    localStorage.setItem("spend-currency", newCurr);
  };

  const formatCurrency = (val) => {
    try {
      // Convert from base currency (VND) to selected currency
      const convertedVal = val / (exchangeRates[currency] || 1);
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: currency }).format(convertedVal);
    } catch {
      const convertedVal = val / (exchangeRates[currency] || 1);
      return `${convertedVal.toFixed(2)} ${currency}`;
    }
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  
  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

  const formatOverrideDate = (val) => {
    if (!val) return "Chọn ngày...";
    const d = new Date(val);
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const groupHistoryByDate = () => {
    const groups = {};
    // Sort history by timestamp descending
    const sorted = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    sorted.forEach(log => {
      const dateKey = formatDate(log.timestamp);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });
    return groups;
  };

  const groupedHistory = groupHistoryByDate();

  return (
    <div className="spending-container animate-slide-in">
      <div className="summary-dashboard">
        <div className="summary-card">
          <div className="summary-label">Hôm nay</div>
          <div className="summary-amount">{formatCurrency(aggregates.daily)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Tuần này</div>
          <div className="summary-amount">{formatCurrency(aggregates.weekly)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Tháng này</div>
          <div className="summary-amount">{formatCurrency(aggregates.monthly)}</div>
        </div>
      </div>

      <div className="spend-controls-row">
        <select 
          className="spend-currency-select" 
          value={currency} 
          onChange={handleCurrencyChange} 
          title="Chọn loại tiền tệ"
          style={{ colorScheme: "dark light" }}
        >
          <option value="VND">VND (₫)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="JPY">JPY (¥)</option>
          <option value="KRW">KRW (₩)</option>
        </select>
        <div className="date-override-container">
          <div className="date-toggle-group">
            <button 
              type="button"
              className={`date-toggle-btn ${!isPastDate ? "active" : ""}`} 
              onClick={() => { setIsPastDate(false); setDateOverride(null); }}
            >
              Hôm nay
            </button>
            {isPastDate ? (
              <DatePicker
                selected={dateOverride}
                onChange={(date) => {
                  const d = dateOverride ? new Date(dateOverride) : new Date();
                  d.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                  setDateOverride(d);
                }}
                dateFormat="dd/MM/yyyy"
                className="spend-date-override-inline"
                placeholderText="Chọn ngày..."
                ref={datePickerRef}
                shouldCloseOnSelect={false}
              >
                <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="date-confirm-btn"
                    onClick={() => {
                      if (datePickerRef.current) {
                        datePickerRef.current.setOpen(false);
                      }
                    }}
                  >
                    Xác nhận
                  </button>
                </div>
              </DatePicker>
            ) : (
              <button 
                type="button"
                className="date-toggle-btn" 
                onClick={() => { 
                  setIsPastDate(true); 
                  if (!dateOverride) {
                    setDateOverride(new Date());
                  }
                }}
              >
                Ngày khác
              </button>
            )}

            {isPastDate && (
              <div className="time-input-inline-container" style={{ display: 'flex', alignItems: 'center' }}>
                {isEditingTime ? (
                  <>
                    <input
                      type="text"
                      className="spend-date-override-inline"
                      style={{ width: '60px', borderBottom: '1px solid var(--spiro)' }}
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const [hours, minutes] = timeInput.split(':').map(Number);
                          if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                            const d = dateOverride ? new Date(dateOverride) : new Date();
                            d.setHours(hours, minutes);
                            setDateOverride(new Date(d));
                            setIsEditingTime(false);
                          }
                        }
                      }}
                      autoFocus
                    />
                    <button 
                      type="button" 
                      className="date-confirm-btn"
                      style={{ padding: '2px 6px', fontSize: '10px', marginLeft: '4px' }}
                      onClick={() => {
                        const [hours, minutes] = timeInput.split(':').map(Number);
                        if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                          const d = dateOverride ? new Date(dateOverride) : new Date();
                          d.setHours(hours, minutes);
                          setDateOverride(new Date(d));
                          setIsEditingTime(false);
                        } else {
                          alert("Định dạng HH:mm (VD: 14:30)");
                        }
                      }}
                    >
                      OK
                    </button>
                  </>
                ) : (
                  <button 
                    type="button" 
                    className="spend-date-override-inline"
                    onClick={() => {
                      if (dateOverride) {
                        setTimeInput(dateOverride.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
                      }
                      setIsEditingTime(true);
                    }}
                  >
                    {dateOverride ? dateOverride.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "Chọn giờ..."}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <form className="spend-input-form" onSubmit={handleSubmit}>
        <input
          ref={amountRef}
          type="number"
          className="spend-input spend-amount"
          placeholder="Số tiền..."
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          type="text"
          className="spend-input spend-product"
          placeholder="Tên sản phẩm/Dịch vụ (VD: Bánh mì, Xăng)..."
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="submit" className="spend-submit-btn">Lưu</button>
      </form>

      <div className="spend-history-container">
        {history.length === 0 ? (
          <div className="empty-state">Chưa có dữ liệu chi tiêu.</div>
        ) : (
          Object.keys(groupedHistory).map(date => {
            const dayTotal = groupedHistory[date].reduce((sum, log) => sum + log.amount, 0);
            return (
              <div key={date} className="spend-day-panel animate-slide-in">
                <div className="spend-date-header">
                  <span>{date}</span>
                  <span className="spend-day-total">Tổng: {formatCurrency(dayTotal)}</span>
                </div>
                <div className="spend-day-items">
                  {groupedHistory[date].map((log) => (
                    <div key={log.id} className="spend-item">
                      <div className="spend-item-time">{formatTime(log.timestamp)}</div>
                      <div className="spend-item-name">{log.product_name}</div>
                      <div className="spend-item-amount">{formatCurrency(log.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
