/**
 * Client-side mirror of the API input contract (backend/app/core/validation.py and the
 * *schemas.py InputModels). Each rule returns a Vietnamese message that names the field
 * and says what format is expected, or undefined when the value is valid.
 *
 * Keep the limits here in sync with the backend: the API stays authoritative, this only
 * catches mistakes before the request and explains them next to the input.
 */

export type FieldErrors = Record<string, string>;
export type Rule = (value: unknown) => string | undefined;
export type FormSchema = Record<string, Rule | Rule[]>;

export const PHONE_PATTERN = /^0[35789]\d{8}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MAX_MONEY = 999_999_999_999;

const text = (value: unknown) => (value == null ? "" : String(value).trim());
const hasControlChars = (value: string) => /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;

type Opts = { required?: boolean; label?: string };

function emptyCheck(value: string, label: string, required: boolean | undefined) {
  if (value) return null;
  return required ? `Vui lòng nhập ${label.toLowerCase()}.` : "";
}

export const rules = {
  /** Required free text with an optional max length. */
  required: (label: string, max?: number): Rule => (value) => {
    const s = text(value);
    if (!s) return `Vui lòng nhập ${label.toLowerCase()}.`;
    if (max && s.length > max) return `${label} tối đa ${max} ký tự (hiện có ${s.length}).`;
    if (hasControlChars(s)) return `${label} chứa ký tự không hợp lệ.`;
  },

  /** Free text that may be empty but has a length limit (Address 255, Reason 1000, Note 5000). */
  maxLength: (label: string, max: number): Rule => (value) => {
    const s = text(value);
    if (s.length > max) return `${label} tối đa ${max} ký tự (hiện có ${s.length}).`;
    if (hasControlChars(s)) return `${label} chứa ký tự không hợp lệ.`;
  },

  /** Name: 1-100 characters on a single line. */
  name: ({ required = true, label = "Họ và tên" }: Opts = {}): Rule => (value) => {
    const s = text(value);
    const empty = emptyCheck(s, label, required);
    if (empty !== null) return empty || undefined;
    if (s.length > 100) return `${label} tối đa 100 ký tự (hiện có ${s.length}).`;
    if (/[\r\n\t]/.test(s) || hasControlChars(s)) return `${label} phải nằm trên một dòng, không chứa ký tự đặc biệt ẩn.`;
  },

  /** Vietnamese mobile number: 10 digits starting with 03, 05, 07, 08 or 09. */
  phone: ({ required = false, label = "Số điện thoại" }: Opts = {}): Rule => (value) => {
    const s = text(value);
    const empty = emptyCheck(s, label, required);
    if (empty !== null) return empty || undefined;
    if (!/^\d+$/.test(s)) return `${label} chỉ gồm chữ số, không có khoảng trắng hay dấu.`;
    if (s.length !== 10) return `${label} phải có đúng 10 chữ số (hiện có ${s.length}).`;
    if (!PHONE_PATTERN.test(s)) return `${label} phải bắt đầu bằng 03, 05, 07, 08 hoặc 09.`;
  },

  email: ({ required = true, label = "Email" }: Opts = {}): Rule => (value) => {
    const s = text(value);
    const empty = emptyCheck(s, label, required);
    if (empty !== null) return empty || undefined;
    if (s.length > 100) return `${label} tối đa 100 ký tự.`;
    if (!EMAIL_PATTERN.test(s)) return `${label} không đúng định dạng, ví dụ: ten@gmail.com.`;
  },

  /** Phone or email, as accepted by the login endpoint. */
  phoneOrEmail: (label = "Email hoặc số điện thoại"): Rule => (value) => {
    const s = text(value);
    if (!s) return `Vui lòng nhập ${label.toLowerCase()}.`;
    if (/^\d+$/.test(s)) return rules.phone({ required: true })(s);
    if (!EMAIL_PATTERN.test(s)) return `${label} không hợp lệ. Nhập email (ten@gmail.com) hoặc số điện thoại 10 chữ số.`;
  },

  /** New password: 8 characters minimum, at most 72 bytes (bcrypt limit). */
  password: ({ required = true, label = "Mật khẩu" }: Opts = {}): Rule => (value) => {
    const s = value == null ? "" : String(value);
    if (!s) return required ? `Vui lòng nhập ${label.toLowerCase()}.` : undefined;
    if (!s.trim()) return `${label} không được chỉ gồm khoảng trắng.`;
    if (s.length < 8) return `${label} cần ít nhất 8 ký tự (hiện có ${s.length}).`;
    if (utf8Bytes(s) > 72) return `${label} quá dài (tối đa 72 byte, chữ có dấu tính 2-3 byte).`;
  },

  loginPassword: (label = "Mật khẩu"): Rule => (value) => {
    const s = value == null ? "" : String(value);
    if (!s.trim()) return `Vui lòng nhập ${label.toLowerCase()}.`;
    if (utf8Bytes(s) > 72) return `${label} quá dài (tối đa 72 byte).`;
  },

  /** Confirmation field: compare against the value it must repeat. */
  matches: (other: () => unknown, message = "Mật khẩu nhập lại không khớp."): Rule => (value) =>
    String(value ?? "") === String(other() ?? "") ? undefined : message,

  otp: (label = "Mã OTP"): Rule => (value) => {
    const s = text(value);
    if (!s) return `Vui lòng nhập ${label.toLowerCase()}.`;
    if (!/^\d{6}$/.test(s)) return `${label} gồm đúng 6 chữ số.`;
  },

  accountNumber: ({ required = true, label = "Số tài khoản" }: Opts = {}): Rule => (value) => {
    const s = text(value);
    const empty = emptyCheck(s, label, required);
    if (empty !== null) return empty || undefined;
    if (!/^\d+$/.test(s)) return `${label} chỉ gồm chữ số, không có khoảng trắng hay dấu chấm.`;
    if (s.length > 50) return `${label} tối đa 50 chữ số.`;
  },

  bankCode: ({ required = true, label = "Ngân hàng" }: Opts = {}): Rule => (value) => {
    const s = text(value);
    if (!s) return required ? `Vui lòng chọn ${label.toLowerCase()}.` : undefined;
    if (!/^[A-Za-z0-9]{1,20}$/.test(s)) return `Mã ${label.toLowerCase()} chỉ gồm chữ và số, tối đa 20 ký tự.`;
  },

  idCard: ({ required = false, label = "Số CCCD" }: Opts = {}): Rule => (value) => {
    const s = text(value);
    const empty = emptyCheck(s, label, required);
    if (empty !== null) return empty || undefined;
    if (!/^\d{12}$/.test(s)) return `${label} phải gồm đúng 12 chữ số (hiện có ${s.replace(/\D/g, "").length}).`;
  },

  /** Integer amount in VND, 0 to 999.999.999.999. */
  money: ({ required = false, label = "Số tiền" }: Opts = {}): Rule => (value) => {
    if (typeof value === "number") {
      if (!Number.isFinite(value) || value < 0) return `${label} phải là số không âm (đơn vị đồng).`;
      if (!Number.isInteger(value)) return `${label} phải là số nguyên, không có phần lẻ.`;
      if (value > MAX_MONEY) return `${label} vượt quá mức tối đa 999.999.999.999 đ.`;
      return undefined;
    }
    // Text input: accept "1.200.000" / "1,200,000" as thousands separators
    const s = text(value).replace(/[.,\s]/g, "");
    const empty = emptyCheck(s, label, required);
    if (empty !== null) return empty || undefined;
    if (!/^\d+$/.test(s)) return `${label} phải là số nguyên không âm (đơn vị đồng).`;
    if (Number(s) > MAX_MONEY) return `${label} vượt quá mức tối đa 999.999.999.999 đ.`;
  },

  quantity: (label = "Số lượng"): Rule => (value) => {
    const n = Number(text(value));
    if (!text(value)) return `Vui lòng nhập ${label.toLowerCase()}.`;
    if (!Number.isFinite(n) || n <= 0) return `${label} phải lớn hơn 0.`;
    if (!/^\d+(\.\d{1,2})?$/.test(text(value))) return `${label} tối đa 2 chữ số thập phân.`;
  },

  integerRange: (label: string, min: number, max: number, required = false): Rule => (value) => {
    const s = text(value);
    if (!s) return required ? `Vui lòng nhập ${label.toLowerCase()}.` : undefined;
    if (!/^-?\d+$/.test(s)) return `${label} phải là số nguyên.`;
    const n = Number(s);
    if (n < min || n > max) return `${label} phải nằm trong khoảng ${min} đến ${max}.`;
  },

  url: ({ required = false, label = "Đường dẫn" }: Opts = {}): Rule => (value) => {
    const s = text(value);
    const empty = emptyCheck(s, label, required);
    if (empty !== null) return empty || undefined;
    if (s.length > 500) return `${label} tối đa 500 ký tự.`;
    try {
      const url = new URL(s);
      if (!/^https?:$/.test(url.protocol)) throw new Error();
    } catch {
      return `${label} phải là địa chỉ web bắt đầu bằng http:// hoặc https://.`;
    }
  },
};

/** Run every rule of every field; returns only the fields that failed (first message each). */
export function validateForm(values: object, schema: FormSchema): FieldErrors {
  const errors: FieldErrors = {};
  const record = values as Record<string, unknown>;
  for (const [field, fieldRules] of Object.entries(schema)) {
    for (const rule of Array.isArray(fieldRules) ? fieldRules : [fieldRules]) {
      const message = rule(record[field]);
      if (message) {
        errors[field] = message;
        break;
      }
    }
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Translating the API's 422 `details` into field-level messages        */
/* ------------------------------------------------------------------ */

export interface ApiFieldIssue {
  field: string;
  message: string;
  type?: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Họ và tên",
  full_name: "Họ và tên",
  phone: "Số điện thoại",
  email: "Email",
  password: "Mật khẩu",
  new_password: "Mật khẩu mới",
  address: "Địa chỉ",
  otp_code: "Mã OTP",
  bank_account: "Tài khoản ngân hàng",
  bank_code: "Ngân hàng",
  bank_name: "Tên ngân hàng",
  account_number: "Số tài khoản",
  account_holder: "Chủ tài khoản",
  id_card_number: "Số CCCD",
  id_card_front_url: "Ảnh CCCD mặt trước",
  id_card_back_url: "Ảnh CCCD mặt sau",
  certificate_url: "Chứng chỉ",
  specialization: "Chuyên môn",
  experience_years: "Số năm kinh nghiệm",
  skills: "Kỹ năng",
  role_id: "Vai trò",
  locked_reason: "Lý do khóa",
  device_type: "Loại xe",
  manufacturer: "Hãng xe",
  model_name: "Dòng xe",
  serial_number: "Biển số",
  frame_number: "Số khung",
  battery_type: "Loại pin",
  manufacturing_year: "Năm sản xuất",
  purchase_date: "Ngày mua",
  image_url: "Ảnh xe",
  notes: "Ghi chú",
  description: "Mô tả sự cố",
  issue_description: "Mô tả sự cố",
  issue_type: "Loại sự cố",
  address_detail: "Địa chỉ",
  location_address: "Địa chỉ",
  booking_date: "Ngày hẹn",
  booking_slot: "Giờ hẹn",
  cancel_reason: "Lý do",
  reject_reason: "Lý do",
  reason: "Lý do",
  diagnosis_note: "Ghi chú chẩn đoán",
  labor_fee: "Tiền công",
  parts_cost: "Tiền linh kiện",
  estimated_price: "Tổng báo giá",
  total_amount: "Tổng tiền",
  final_cost: "Tổng tiền",
  price: "Đơn giá",
  unit_price: "Đơn giá",
  quantity: "Số lượng",
  item_name: "Tên hạng mục",
  comment: "Nhận xét",
  rating: "Số sao",
  note: "Ghi chú",
};

/** Messages the backend writes itself (value_error) that are already user-facing Vietnamese. */
const stripPrefix = (msg: string) => msg.replace(/^(Value error|Assertion failed),\s*/i, "");
const numberIn = (msg: string) => msg.match(/(\d[\d.]*)/)?.[1];

function leafName(path: string) {
  const parts = path.split(".").filter((p) => p && !/^\d+$/.test(p) && p !== "body");
  return parts[parts.length - 1] ?? path;
}

/** Turn one pydantic issue into a sentence a customer or technician can act on. */
export function explainApiIssue(issue: ApiFieldIssue): string {
  const key = leafName(issue.field);
  const label = FIELD_LABELS[key] ?? key;
  const type = issue.type ?? "";
  const msg = issue.message ?? "";

  if (type === "string_pattern_mismatch") {
    if (key === "phone") return "Số điện thoại phải có 10 chữ số và bắt đầu bằng 03, 05, 07, 08 hoặc 09.";
    if (key === "otp_code") return "Mã OTP gồm đúng 6 chữ số.";
    if (key === "account_number") return "Số tài khoản chỉ gồm chữ số.";
    if (key === "bank_code") return "Mã ngân hàng chỉ gồm chữ và số.";
    if (key === "id_card_number") return "Số CCCD phải gồm đúng 12 chữ số.";
    return `${label} không đúng định dạng.`;
  }
  if (type === "missing") return `Vui lòng nhập ${label.toLowerCase()}.`;
  if (type.startsWith("string_too_")) {
    // Digit-only fields: length errors are about digits, not "characters"
    if (key === "phone") return "Số điện thoại phải có đúng 10 chữ số.";
    if (key === "otp_code") return "Mã OTP gồm đúng 6 chữ số.";
    if (key === "id_card_number") return "Số CCCD phải gồm đúng 12 chữ số.";
  }
  if (type === "string_too_short") {
    const n = numberIn(msg);
    return n === "1" || !n ? `Vui lòng nhập ${label.toLowerCase()}.` : `${label} cần ít nhất ${n} ký tự.`;
  }
  if (type === "string_too_long") return `${label} tối đa ${numberIn(msg) ?? "cho phép"} ký tự.`;
  if (type === "too_long") return `${label} có quá nhiều mục (tối đa ${numberIn(msg) ?? "cho phép"}).`;
  if (type === "greater_than_equal") return `${label} phải lớn hơn hoặc bằng ${numberIn(msg) ?? 0}.`;
  if (type === "greater_than") return `${label} phải lớn hơn ${numberIn(msg) ?? 0}.`;
  if (type === "less_than_equal") return `${label} không được vượt quá ${numberIn(msg) ?? ""}.`;
  if (type.startsWith("decimal_") || type === "int_from_float") return `${label} phải là số nguyên, không có phần thập phân.`;
  if (type.startsWith("url_")) return `${label} phải là địa chỉ web hợp lệ (http:// hoặc https://).`;
  if (type.endsWith("_parsing") || type.endsWith("_type")) {
    if (key.endsWith("date")) return `${label} không đúng định dạng ngày (YYYY-MM-DD).`;
    return `${label} có kiểu dữ liệu không hợp lệ.`;
  }
  if (type === "extra_forbidden") return `Trường "${key}" không được máy chủ chấp nhận. Vui lòng báo cho bộ phận kỹ thuật.`;
  if (/email/i.test(msg) && type === "value_error" && !/[À-ỹ]/.test(msg)) return `${label} không đúng định dạng, ví dụ: ten@gmail.com.`;
  if (type === "value_error" || type === "assertion_error") {
    const vi = stripPrefix(msg);
    return key === "root" || key === "body" ? vi : `${label}: ${vi.charAt(0).toLowerCase()}${vi.slice(1)}`;
  }
  return `${label}: ${stripPrefix(msg)}`;
}

/**
 * Map API issues onto form keys. `fieldMap` renames API fields to form fields when they
 * differ (e.g. { full_name: "name" }). Issues on unknown fields go under "_form".
 */
export function apiFieldErrors(details: unknown, fieldMap: Record<string, string> = {}): FieldErrors {
  if (!Array.isArray(details)) return {};
  const errors: FieldErrors = {};
  for (const issue of details as ApiFieldIssue[]) {
    if (!issue || typeof issue.field !== "string") continue;
    const key = leafName(issue.field);
    const target = fieldMap[key] ?? fieldMap[issue.field] ?? key;
    if (!errors[target]) errors[target] = explainApiIssue(issue);
  }
  return errors;
}

/** One readable sentence for alerts and form-level banners. */
export function describeApiIssues(details: unknown): string | null {
  if (!Array.isArray(details) || details.length === 0) return null;
  const messages = [...new Set((details as ApiFieldIssue[]).map(explainApiIssue))];
  return messages.slice(0, 3).join(" ") + (messages.length > 3 ? ` (và ${messages.length - 3} lỗi khác)` : "");
}
