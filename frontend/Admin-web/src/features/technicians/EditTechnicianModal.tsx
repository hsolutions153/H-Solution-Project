"use client";
import type { Technician } from "@/types/api";

import { Award, CreditCard, Edit3, Lock, Phone, RefreshCw, Save, X } from "lucide-react";
import React,{ useState } from "react";
import { FieldError, rules, useFieldErrors } from "@h-mobility/ui";

export interface EditTechnicianModalProps {
  technician: Technician;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const EditTechnicianModal = ({
  technician,
  onClose,
  onSuccess,
}: EditTechnicianModalProps) => {
  const techId = technician.user_id || technician.id;
  const initialName =
    technician.full_name || technician.user?.full_name || technician.name || "";
  const initialPhone = technician.phone || technician.user?.phone || "";

  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [specialization, setSpecialization] = useState(
    technician.specialization || "Kỹ thuật viên Sửa chữa H-Solution"
  );
  const [experienceYears, setExperienceYears] = useState(
    technician.experience_years ?? 3
  );
  const [skills, setSkills] = useState(technician.skills || "BOTH");
  const [isOnline, setIsOnline] = useState(Boolean(technician.is_online));
  const [bankCode, setBankCode] = useState(technician.bank_account?.bank_code || "");
  const [bankName, setBankName] = useState(technician.bank_account?.bank_name || "");
  const [accountNumber, setAccountNumber] = useState(technician.bank_account?.account_number || "");
  const [accountHolder, setAccountHolder] = useState(technician.bank_account?.account_holder || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { errors, validate, fromApi, clearError, inputProps } = useFieldErrors();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Tài khoản ngân hàng là tùy chọn; đã nhập số tài khoản hoặc chủ tài khoản thì phải có số tài khoản hợp lệ
    const hasBank = Boolean(accountNumber.trim() || accountHolder.trim());
    const valid = validate({ fullName, phone, specialization, experienceYears, bankCode, bankName, accountNumber, accountHolder }, {
        fullName: rules.name(),
        phone: rules.phone(),
        specialization: rules.maxLength("Chuyên môn", 255),
        experienceYears: rules.integerRange("Số năm kinh nghiệm", 0, 60, true),
        bankCode: rules.bankCode({ required: false, label: "Mã ngân hàng" }),
        bankName: rules.name({ required: false, label: "Tên ngân hàng" }),
        accountNumber: rules.accountNumber({ required: hasBank }),
        accountHolder: rules.name({ required: false, label: "Chủ tài khoản" }),
      });
    if (!valid) return;

    setLoading(true);
    setError("");

    try {
      const { fetchApi } = await import("@/lib/api-client");
      const bankAccountPayload = accountNumber.trim()
        ? {
            bank_code: bankCode.trim() || "MB",
            bank_name: bankName.trim() || "MB Bank",
            account_number: accountNumber.trim(),
            account_holder: accountHolder.trim() || fullName.trim(),
          }
        : null;

      await fetchApi(`/technicians/${techId}`, {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          specialization: specialization.trim(),
          experience_years: Number(experienceYears),
          skills: skills,
          is_online: isOnline,
          bank_account: bankAccountPayload,
        }),
      });

      onSuccess(`Cập nhật thông tin kỹ thuật viên ${fullName.trim()} thành công!`);
      onClose();
    } catch (err: unknown) {
      if (fromApi(err, { full_name: "fullName", experience_years: "experienceYears", bank_code: "bankCode", bank_name: "bankName", account_number: "accountNumber", account_holder: "accountHolder" })) return;
      if (err instanceof Error) {
        setError(err.message || "Lỗi khi cập nhật kỹ thuật viên.");
      } else {
        setError("Lỗi khi cập nhật kỹ thuật viên.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-amber-400 uppercase">
                Quản trị đội ngũ
              </span>
              <h3 className="text-xl font-black mt-0.5">Sửa Kỹ Thuật Viên</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase mb-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Mã Kỹ thuật viên (Cố định)</span>
            </label>
            <input
              type="text"
              value={techId}
              disabled
              readOnly
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-500 cursor-not-allowed select-none outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              {...inputProps("fullName")}
              onChange={(e) => {
                setFullName(e.target.value);
                clearError("fullName");
              }}
              placeholder="VD: Nguyễn Văn A"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
            />
            <FieldError id="fullName-error" message={errors.fullName} />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase mb-1.5">
              <Phone className="w-4 h-4 text-brand-700" />
              Số điện thoại
            </label>
            <input
              type="text"
              value={phone}
              {...inputProps("phone")}
              onChange={(e) => {
                setPhone(e.target.value);
                clearError("phone");
              }}
              placeholder="VD: 0987654321"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
            />
            <FieldError id="phone-error" message={errors.phone} />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase mb-1.5">
              <Award className="w-4 h-4 text-brand-700" />
              Chuyên môn kỹ thuật
            </label>
            <input
              type="text"
              value={specialization}
              {...inputProps("specialization")}
              onChange={(e) => {
                setSpecialization(e.target.value);
                clearError("specialization");
              }}
              placeholder="VD: Sửa chữa xe Scooter điện & Bo mạch điều khiển"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
            />
            <FieldError id="specialization-error" message={errors.specialization} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Kinh nghiệm (Năm)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={experienceYears}
                {...inputProps("experienceYears")}
                onChange={(e) => {
                  setExperienceYears(Number(e.target.value));
                  clearError("experienceYears");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
              />
              <FieldError id="experienceYears-error" message={errors.experienceYears} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Kỹ năng chuyên môn
              </label>
              <select
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none cursor-pointer"
              >
                <option value="BOTH">Tất cả thiết bị</option>
                <option value="SCOOTER">Chuyên Scooter điện</option>
                <option value="WHEELCHAIR">Chuyên xe hỗ trợ</option>
              </select>
            </div>
          </div>

          <div className="pt-1">
            <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">
              Trạng thái sẵn sàng nhận đơn
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsOnline(!isOnline)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isOnline
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-slate-100 border-slate-300 text-slate-500"
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isOnline ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                <span>{isOnline ? "Đang Online (Sẵn sàng nhận việc)" : "Đang Offline (Ngoại tuyến)"}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase mb-2">
              <CreditCard className="w-4 h-4 text-brand-700" />
              Tài khoản ngân hàng nhận tiền (STK)
            </label>
            <div className="grid grid-cols-2 gap-3 mb-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mã ngân hàng</label>
                <input
                  type="text"
                  value={bankCode}
                  {...inputProps("bankCode")}
                  onChange={(e) => {
                    setBankCode(e.target.value);
                    clearError("bankCode");
                  }}
                  placeholder="VD: MB, VCB"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
                />
                <FieldError id="bankCode-error" message={errors.bankCode} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tên ngân hàng</label>
                <input
                  type="text"
                  value={bankName}
                  {...inputProps("bankName")}
                  onChange={(e) => {
                    setBankName(e.target.value);
                    clearError("bankName");
                  }}
                  placeholder="VD: MB Bank, Vietcombank"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
                />
                <FieldError id="bankName-error" message={errors.bankName} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Số tài khoản</label>
                <input
                  type="text"
                  value={accountNumber}
                  {...inputProps("accountNumber")}
                  onChange={(e) => {
                    setAccountNumber(e.target.value);
                    clearError("accountNumber");
                  }}
                  placeholder="Chỉ gồm chữ số"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
                />
                <FieldError id="accountNumber-error" message={errors.accountNumber} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Chủ tài khoản (IN HOA)</label>
                <input
                  type="text"
                  value={accountHolder}
                  {...inputProps("accountHolder")}
                  onChange={(e) => {
                    setAccountHolder(e.target.value);
                    clearError("accountHolder");
                  }}
                  placeholder="Họ tên chủ thẻ"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-brand-800 outline-none"
                />
                <FieldError id="accountHolder-error" message={errors.accountHolder} />
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-950 disabled:opacity-50 text-white text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
