"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown, LoaderCircle, Search, X } from "lucide-react";

export interface VietQRBank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  short_name?: string;
}

let cachedBanks: VietQRBank[] | null = null;

function normalizeText(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

interface BankSelectProps {
  valueCode: string;
  valueName: string;
  onChange: (code: string, name: string) => void;
  disabled?: boolean;
  /** Validation wiring from useFieldErrors().inputProps, applied to the trigger button. */
  name?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function BankSelect({ valueCode, valueName, onChange, disabled, ...fieldProps }: BankSelectProps) {
  const [banks, setBanks] = useState<VietQRBank[]>(cachedBanks || []);
  const [loading, setLoading] = useState<boolean>(!cachedBanks);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tải danh sách ngân hàng từ VietQR API
  useEffect(() => {
    if (cachedBanks && cachedBanks.length > 0) {
      setBanks(cachedBanks);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchBanks() {
      try {
        const res = await fetch("https://api.vietqr.io/v2/banks");
        const json = await res.json();
        if (json?.code === "00" && Array.isArray(json?.data) && json.data.length > 0) {
          cachedBanks = json.data;
          if (isMounted) {
            setBanks(json.data);
          }
        }
      } catch (err) {
        console.error("Không thể tải danh sách ngân hàng VietQR:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchBanks();
    return () => {
      isMounted = false;
    };
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Tự động focus ô tìm kiếm khi mở
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Tìm ngân hàng đang chọn
  const selectedBank = useMemo(() => {
    if (!banks.length) return null;
    return (
      banks.find((b) => b.code.toLowerCase() === valueCode.toLowerCase()) ||
      banks.find((b) => normalizeText(b.shortName) === normalizeText(valueName)) ||
      null
    );
  }, [banks, valueCode, valueName]);

  // Lọc danh sách theo từ khóa tìm kiếm
  const filteredBanks = useMemo(() => {
    const q = normalizeText(search);
    if (!q) return banks;
    return banks.filter((b) => {
      return (
        normalizeText(b.code).includes(q) ||
        normalizeText(b.shortName).includes(q) ||
        (b.short_name && normalizeText(b.short_name).includes(q)) ||
        normalizeText(b.name).includes(q)
      );
    });
  }, [banks, search]);

  const handleSelect = (bank: VietQRBank) => {
    onChange(bank.code, bank.shortName || bank.name);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        {...fieldProps}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-control border border-line bg-white px-3 py-2 text-left text-xs text-ink transition-colors hover:border-slate-300 focus:border-brand-500 focus:outline-none cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedBank ? (
            <>
              {selectedBank.logo ? (
                <img
                  src={selectedBank.logo}
                  alt={selectedBank.code}
                  className="h-5 w-8 object-contain shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <Building2 className="size-4 text-brand-600 shrink-0" />
              )}
              <div className="truncate">
                <span className="font-semibold text-ink">{selectedBank.shortName || valueName}</span>{" "}
                <span className="text-[11px] text-slate-400">({selectedBank.code || valueCode})</span>
              </div>
            </>
          ) : valueCode || valueName ? (
            <div className="truncate">
              <span className="font-semibold text-ink">{valueName || valueCode}</span>{" "}
              {valueCode && <span className="text-[11px] text-slate-400">({valueCode})</span>}
            </div>
          ) : (
            <span className="text-slate-400">Chọn ngân hàng thụ hưởng...</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {loading ? (
            <LoaderCircle className="size-3.5 animate-spin text-brand-600" />
          ) : (
            <ChevronDown className={`size-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-hidden rounded-control border border-line bg-white shadow-xl flex flex-col">
          <div className="p-2 border-b border-line bg-slate-50 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 size-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc mã (VCB, MB, Techcombank...)"
                className="w-full rounded-control border border-line bg-white pl-8 pr-7 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto max-h-56 divide-y divide-line/40">
            {filteredBanks.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Không tìm thấy ngân hàng phù hợp với &quot;{search}&quot;
              </div>
            ) : (
              filteredBanks.map((bank) => {
                const isSelected =
                  bank.code.toLowerCase() === valueCode.toLowerCase() ||
                  normalizeText(bank.shortName) === normalizeText(valueName);

                return (
                  <button
                    key={bank.id || bank.code}
                    type="button"
                    onClick={() => handleSelect(bank)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                      isSelected ? "bg-brand-50/70" : ""
                    }`}
                  >
                    {bank.logo ? (
                      <img
                        src={bank.logo}
                        alt={bank.code}
                        className="h-6 w-9 object-contain shrink-0 bg-white rounded p-0.5 border border-line/40"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="h-6 w-9 rounded bg-slate-100 flex items-center justify-center shrink-0">
                        <Building2 className="size-3.5 text-slate-500" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-ink">{bank.shortName}</span>
                        <span className="text-[10px] font-mono font-medium bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-line/40">
                          {bank.code}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-slate-500">{bank.name}</p>
                    </div>

                    {isSelected && <Check className="size-4 text-brand-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
