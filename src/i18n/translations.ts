// Translation dictionaries for English, Vietnamese, and Korean

import type { Translation } from "./types";

export const en: Translation = {
  // Navigation
  "nav.log": "Log",
  "nav.calendar": "Calendar",
  "nav.spending": "Spending",
  "nav.settings": "Settings",

  // Summary cards
  "summary.today": "Today",
  "summary.thisWeek": "This Week",
  "summary.thisMonth": "This Month",

  // Settings sections
  "settings.title": "Settings",
  "settings.appearance": "Appearance",
  "settings.language": "Language",
  "settings.currency": "Currency",

  // Appearance settings
  "settings.theme": "Theme",
  "settings.backgroundEffects": "Background Effects",
  "settings.themeIntensity": "Theme Intensity",
  "settings.performanceMode": "Performance Mode",
  "settings.autoReduceMotion": "Auto reduce motion in fullscreen",
  "settings.compactTransactionView": "Compact Transaction View",
  "settings.transactionDensity.comfortable": "Comfortable",
  "settings.transactionDensity.compact": "Compact",

  // Language settings
  "settings.appLanguage": "App Language",
  "settings.formatLocaleMode": "Date / Number Format",
  "settings.formatMode.language": "Follow App Language",
  "settings.formatMode.currency": "Follow Display Currency",
  "settings.autoMatchLanguageToCurrency": "Auto-match language to display currency",

  // Currency settings
  "settings.defaultCurrency": "Default Currency",
  "settings.displayCurrency": "Display Currency",

  // Help settings
  "settings.showHelpButtons": "Show help buttons",

  // No-Spend settings
  "settings.noSpendPreviewToday": "Preview today in no-spend status",
  "settings.noSpendExcludeIncome": "Income does not break streak",
  "settings.noSpendStartFromFirst": "Start from first logged transaction",

  // Recurring payments settings
  "settings.defaultReminderDays": "Default Reminder Days",
  "settings.showOverdueFirst": "Show overdue payments first",
  "settings.showDashboardReminders": "Show bill reminders on dashboard",

  // Spending page
  "spending.title": "Spending Insights",
  "spending.addExpense": "Add Expense",
  "spending.transactions": "Transactions",
  "spending.filters": "Filters",
  "spending.search": "Search",
  "spending.category": "Category",
  "spending.tags": "Tags",
  "spending.paymentMethod": "Payment Method",
  "spending.amount": "Amount",
  "spending.description": "Description",
  "spending.note": "Note",
  "spending.save": "Save",
  "spending.cancel": "Cancel",
  "spending.edit": "Edit",
  "spending.duplicate": "Duplicate",
  "spending.delete": "Delete",
  "spending.recurringPayment": "Recurring payment",
  "spending.repeats": "Repeats",
  "spending.date": "Date",
  "spending.time": "Time",
  "spending.currency": "Currency",

  // Budget
  "spending.budget": "Budget",
  "spending.monthlyBudget": "Monthly Budget",
  "spending.budgetUsedPercent": "You have used {{percent}}% of your monthly budget.",
  "spending.budgetRemaining": "Remaining",

  // Bills & Subscriptions
  "spending.billsSubscriptions": "Bills & Subscriptions",
  "spending.addRecurringPayment": "Add Recurring Payment",
  "spending.noRecurringPayments": "No recurring payments yet",
  "spending.name": "Name",
  "spending.frequency": "Frequency",
  "spending.startDate": "Start Date",
  "spending.nextDueDate": "Next Due Date",
  "spending.reminderDaysBefore": "Reminder Days Before",
  "spending.status": "Status",

  // No-Spend Tracker
  "noSpend.title": "No-Spend Tracker",
  "noSpend.currentStreak": "Current streak",
  "noSpend.longestStreak": "Longest streak",
  "noSpend.thisMonth": "This month",
  "noSpend.today": "Today",
  "noSpend.noSpendingToday": "No spending recorded today so far",
  "noSpend.spendingToday": "Spending recorded today",
  "noSpend.monthView": "No-Spend Month View",

  // Smart Review
  "smartReview.title": "Smart Review",
  "smartReview.insights": "Insights",
  "smartReview.suggestions": "Suggestions",
  "smartReview.addMoreExpenses": "Add more expenses to generate a useful review",

  // Common actions
  "actions.close": "Close",
  "actions.clear": "Clear",
  "actions.apply": "Apply",
  "actions.reset": "Reset",

  // Frequency labels
  "frequency.weekly": "Weekly",
  "frequency.monthly": "Monthly",
  "frequency.yearly": "Yearly",
  "frequency.custom": "Custom",

  // Status labels
  "status.overdue": "Overdue",
  "status.today": "Today",
  "status.soon": "Soon",
  "status.later": "Later",
  "status.paused": "Paused",
  "status.ended": "Ended",
  "status.active": "Active",

  // Empty states
  "empty.noLogs": "No activity logged yet. Start typing above!",
  "empty.noTransactions": "No transactions found.",
  "empty.noResults": "No results found.",

  // Validation messages
  "validation.required": "This field is required.",
  "validation.positiveAmount": "Amount must be a positive number.",
};

export const vi: Translation = {
  // Navigation
  "nav.log": "Nhật ký",
  "nav.calendar": "Lịch",
  "nav.spending": "Chi tiêu",
  "nav.settings": "Cài đặt",

  // Summary cards
  "summary.today": "Hôm nay",
  "summary.thisWeek": "Tuần này",
  "summary.thisMonth": "Tháng này",

  // Settings sections
  "settings.title": "Cài đặt",
  "settings.appearance": "Giao diện",
  "settings.language": "Ngôn ngữ",
  "settings.currency": "Tiền tệ",

  // Appearance settings
  "settings.theme": "Chủ đề",
  "settings.backgroundEffects": "Hiệu ứng nền",
  "settings.themeIntensity": "Cường độ chủ đề",
  "settings.performanceMode": "Chế độ hiệu suất",
  "settings.autoReduceMotion": "Tự động giảm chuyển động khi toàn màn hình",
  "settings.compactTransactionView": "Chế độ xem giao dịch gọn",
  "settings.transactionDensity.comfortable": "Thoải mái",
  "settings.transactionDensity.compact": "Gọn gàng",

  // Language settings
  "settings.appLanguage": "Ngôn ngữ ứng dụng",
  "settings.formatLocaleMode": "Định dạng ngày / số",
  "settings.formatMode.language": "Theo ngôn ngữ ứng dụng",
  "settings.formatMode.currency": "Theo tiền tệ hiển thị",
  "settings.autoMatchLanguageToCurrency": "Tự động khớp ngôn ngữ với tiền tệ hiển thị",

  // Currency settings
  "settings.defaultCurrency": "Tiền tệ mặc định",
  "settings.displayCurrency": "Tiền tệ hiển thị",

  // Help settings
  "settings.showHelpButtons": "Hiển thị nút trợ giúp",

  // No-Spend settings
  "settings.noSpendPreviewToday": "Xem trước hôm nay trong trạng thái không chi tiêu",
  "settings.noSpendExcludeIncome": "Thu nhập không làm gián đoạn chuỗi ngày",
  "settings.noSpendStartFromFirst": "Bắt đầu từ giao dịch đầu tiên",

  // Recurring payments settings
  "settings.defaultReminderDays": "Số ngày nhắc nhở mặc định",
  "settings.showOverdueFirst": "Hiển thị khoản quá hạn trước",
  "settings.showDashboardReminders": "Hiển thị nhắc nhở hóa đơn trên bảng điều khiển",

  // Spending page
  "spending.title": "Thông tin chi tiêu",
  "spending.addExpense": "Thêm chi phí",
  "spending.transactions": "Giao dịch",
  "spending.filters": "Bộ lọc",
  "spending.search": "Tìm kiếm",
  "spending.category": "Danh mục",
  "spending.tags": "Thẻ",
  "spending.paymentMethod": "Phương thức thanh toán",
  "spending.amount": "Số tiền",
  "spending.description": "Mô tả",
  "spending.note": "Ghi chú",
  "spending.save": "Lưu",
  "spending.cancel": "Hủy",
  "spending.edit": "Sửa",
  "spending.duplicate": "Nhân bản",
  "spending.delete": "Xóa",
  "spending.recurringPayment": "Thanh toán định kỳ",
  "spending.repeats": "Lặp lại",
  "spending.date": "Ngày",
  "spending.time": "Giờ",
  "spending.currency": "Tiền tệ",

  // Budget
  "spending.budget": "Ngân sách",
  "spending.monthlyBudget": "Ngân sách tháng",
  "spending.budgetUsedPercent": "Bạn đã dùng {{percent}}% ngân sách tháng.",
  "spending.budgetRemaining": "Còn lại",

  // Bills & Subscriptions
  "spending.billsSubscriptions": "Hóa đơn & Đăng ký",
  "spending.addRecurringPayment": "Thêm thanh toán định kỳ",
  "spending.noRecurringPayments": "Chưa có thanh toán định kỳ nào",
  "spending.name": "Tên",
  "spending.frequency": "Tần suất",
  "spending.startDate": "Ngày bắt đầu",
  "spending.nextDueDate": "Ngày đến hạn tiếp theo",
  "spending.reminderDaysBefore": "Số ngày nhắc nhở trước",
  "spending.status": "Trạng thái",

  // No-Spend Tracker
  "noSpend.title": "Theo dõi không chi tiêu",
  "noSpend.currentStreak": "Chuỗi hiện tại",
  "noSpend.longestStreak": "Chuỗi dài nhất",
  "noSpend.thisMonth": "Tháng này",
  "noSpend.today": "Hôm nay",
  "noSpend.noSpendingToday": "Chưa ghi nhận chi tiêu nào hôm nay",
  "noSpend.spendingToday": "Đã ghi nhận chi tiêu hôm nay",
  "noSpend.monthView": "Xem tháng không chi tiêu",

  // Smart Review
  "smartReview.title": "Đánh giá thông minh",
  "smartReview.insights": "Thông tin chi tiết",
  "smartReview.suggestions": "Gợi ý",
  "smartReview.addMoreExpenses": "Thêm nhiều chi tiêu hơn để tạo đánh giá hữu ích",

  // Common actions
  "actions.close": "Đóng",
  "actions.clear": "Xóa",
  "actions.apply": "Áp dụng",
  "actions.reset": "Đặt lại",

  // Frequency labels
  "frequency.weekly": "Hàng tuần",
  "frequency.monthly": "Hàng tháng",
  "frequency.yearly": "Hàng năm",
  "frequency.custom": "Tùy chỉnh",

  // Status labels
  "status.overdue": "Quá hạn",
  "status.today": "Hôm nay",
  "status.soon": "Sắp tới",
  "status.later": "Sau này",
  "status.paused": "Tạm dừng",
  "status.ended": "Kết thúc",
  "status.active": "Hoạt động",

  // Empty states
  "empty.noLogs": "Chưa có hoạt động nào được ghi lại. Bắt đầu nhập ở trên!",
  "empty.noTransactions": "Không tìm thấy giao dịch nào.",
  "empty.noResults": "Không tìm thấy kết quả nào.",

  // Validation messages
  "validation.required": "Trường này là bắt buộc.",
  "validation.positiveAmount": "Số tiền phải là số dương.",
};

export const ko: Translation = {
  // Navigation
  "nav.log": "로그",
  "nav.calendar": "캘린더",
  "nav.spending": "지출",
  "nav.settings": "설정",

  // Summary cards
  "summary.today": "오늘",
  "summary.thisWeek": "이번 주",
  "summary.thisMonth": "이번 달",

  // Settings sections
  "settings.title": "설정",
  "settings.appearance": "외관",
  "settings.language": "언어",
  "settings.currency": "통화",

  // Appearance settings
  "settings.theme": "테마",
  "settings.backgroundEffects": "배경 효과",
  "settings.themeIntensity": "테마 강도",
  "settings.performanceMode": "성능 모드",
  "settings.autoReduceMotion": "전체 화면에서 동작 자동 감소",
  "settings.compactTransactionView": "간단한 거래 보기",
  "settings.transactionDensity.comfortable": "편안하게",
  "settings.transactionDensity.compact": "간단하게",

  // Language settings
  "settings.appLanguage": "앱 언어",
  "settings.formatLocaleMode": "날짜 / 숫자 형식",
  "settings.formatMode.language": "앱 언어 따르기",
  "settings.formatMode.currency": "표시 통화 따르기",
  "settings.autoMatchLanguageToCurrency": "표시 통화에 언어 자동 일치",

  // Currency settings
  "settings.defaultCurrency": "기본 통화",
  "settings.displayCurrency": "표시 통화",

  // Help settings
  "settings.showHelpButtons": "도움말 버튼 표시",

  // No-Spend settings
  "settings.noSpendPreviewToday": "오늘 지출 없음 상태 미리보기",
  "settings.noSpendExcludeIncome": "수입은 연속 기록을 깨뜨리지 않음",
  "settings.noSpendStartFromFirst": "첫 거래부터 시작",

  // Recurring payments settings
  "settings.defaultReminderDays": "기본 알림일",
  "settings.showOverdueFirst": "연체된 결제 먼저 표시",
  "settings.showDashboardReminders": "대시보드에 청구서 알림 표시",

  // Spending page
  "spending.title": "지출 인사이트",
  "spending.addExpense": "비용 추가",
  "spending.transactions": "거래",
  "spending.filters": "필터",
  "spending.search": "검색",
  "spending.category": "카테고리",
  "spending.tags": "태그",
  "spending.paymentMethod": "결제 수단",
  "spending.amount": "금액",
  "spending.description": "설명",
  "spending.note": "메모",
  "spending.save": "저장",
  "spending.cancel": "취소",
  "spending.edit": "수정",
  "spending.duplicate": "복제",
  "spending.delete": "삭제",
  "spending.recurringPayment": "정기 결제",
  "spending.repeats": "반복",
  "spending.date": "날짜",
  "spending.time": "시간",
  "spending.currency": "통화",

  // Budget
  "spending.budget": "예산",
  "spending.monthlyBudget": "월 예산",
  "spending.budgetUsedPercent": "월 예산의 {{percent}}% 를 사용했습니다.",
  "spending.budgetRemaining": "남음",

  // Bills & Subscriptions
  "spending.billsSubscriptions": "청구서 및 구독",
  "spending.addRecurringPayment": "정기 결제 추가",
  "spending.noRecurringPayments": "아직 정기 결제가 없습니다",
  "spending.name": "이름",
  "spending.frequency": "빈도",
  "spending.startDate": "시작일",
  "spending.nextDueDate": "다음 기한",
  "spending.reminderDaysBefore": "알림일 (전)",
  "spending.status": "상태",

  // No-Spend Tracker
  "noSpend.title": "지출 없음 추적기",
  "noSpend.currentStreak": "현재 연속 기록",
  "noSpend.longestStreak": "최장 연속 기록",
  "noSpend.thisMonth": "이번 달",
  "noSpend.today": "오늘",
  "noSpend.noSpendingToday": "오늘은 아직 지출이 기록되지 않았습니다",
  "noSpend.spendingToday": "오늘 지출이 기록됨",
  "noSpend.monthView": "지출 없음 월간 보기",

  // Smart Review
  "smartReview.title": "스마트 리뷰",
  "smartReview.insights": "인사이트",
  "smartReview.suggestions": "제안",
  "smartReview.addMoreExpenses": "유용한 리뷰를 생성하려면 더 많은 비용 추가",

  // Common actions
  "actions.close": "닫기",
  "actions.clear": "지우기",
  "actions.apply": "적용",
  "actions.reset": "재설정",

  // Frequency labels
  "frequency.weekly": "주간",
  "frequency.monthly": "월간",
  "frequency.yearly": "연간",
  "frequency.custom": "사용자 정의",

  // Status labels
  "status.overdue": "연체",
  "status.today": "오늘",
  "status.soon": "곧",
  "status.later": "나중",
  "status.paused": "일시 중지",
  "status.ended": "종료",
  "status.active": "활성",

  // Empty states
  "empty.noLogs": "아직 기록된 활동이 없습니다. 위에 입력을 시작하세요!",
  "empty.noTransactions": "거래를 찾을 수 없습니다.",
  "empty.noResults": "결과를 찾을 수 없습니다.",

  // Validation messages
  "validation.required": "이 필드는 필수입니다.",
  "validation.positiveAmount": "금액은 양수여야 합니다.",
};

export const translations: Record<"en" | "vi" | "ko", Translation> = {
  en,
  vi,
  ko,
};
