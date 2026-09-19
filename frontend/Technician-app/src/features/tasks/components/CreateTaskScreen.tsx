"use client";

import React, { useState } from 'react';
import { ArrowLeft, Camera, QrCode, ArrowRight, Search, ChevronDown, Plus, MapPin, RefreshCw, X } from 'lucide-react';

interface CreateTaskScreenProps {
  onBack: () => void;
  onSubmitSuccess: () => void;
  onLogout?: () => void;
}

export const CreateTaskScreen: React.FC<CreateTaskScreenProps> = ({ onBack, onSubmitSuccess }) => {
  const [customerType, setCustomerType] = useState<'new' | 'old'>('new');
  
  // State form cho Khách hàng mới
  const [newFormData, setNewFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    deviceType: '',
    brandModel: '',
    serialNumber: '',
    description: '',
  });

  // State cho Khách hàng cũ
  const [selectedOldCustomer, setSelectedOldCustomer] = useState(true); // Giả lập đã chọn sẵn 1 khách hàng cũ
  const [isAddingNewDevice, setIsAddingNewDevice] = useState(false); // Quản lý trạng thái hiện/ẩn form thêm thiết bị mới cho KH cũ
  const [oldFormData, setOldFormData] = useState({
    searchKeyword: '',
    selectedDevice: 'Xe lăn điện Karma KP-80 - SN: KM12345',
    deviceType: 'Xe lăn điện',
    brandModel: 'Karma KP-80',
    serialNumber: 'KM12345',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitSuccess();
  };

  return (
    <div className="p-4 pb-28 space-y-4 relative">
      
      
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Tiếp nhận hiện trường
        </button>
      </div>

      <form id="create-task-form" onSubmit={handleSubmit} className="space-y-4">
        
        
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 space-y-3">
          
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                customerType === 'new' ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-500'
              }`}
              onClick={() => setCustomerType('new')}
            >
              Khách hàng mới
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                customerType === 'old' ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-500'
              }`}
              onClick={() => setCustomerType('old')}
            >
              Khách hàng cũ
            </button>
          </div>

          
          {customerType === 'new' ? (
            <div className="space-y-3 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên khách hàng</label>
                <input
                  type="text"
                  placeholder="Nhập họ và tên..."
                  value={newFormData.customerName}
                  onChange={(e) => setNewFormData({ ...newFormData, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="090..."
                    value={newFormData.phone}
                    onChange={(e) => setNewFormData({ ...newFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ</label>
                  <input
                    type="text"
                    placeholder="Số nhà, tên đường"
                    value={newFormData.address}
                    onChange={(e) => setNewFormData({ ...newFormData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* NỘI DUNG KHI LÀ KHÁCH HÀNG CŨ */
            <div className="space-y-3 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tìm kiếm khách hàng</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm theo SĐT, Tên khách hàng hoặc Mã KH..."
                    value={oldFormData.searchKeyword}
                    onChange={(e) => setOldFormData({ ...oldFormData, searchKeyword: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              
              {selectedOldCustomer && (
                <div className="p-3 bg-slate-50 border border-sky-100 rounded-xl relative space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-sky-900">Nguyễn Văn An - 0901234567</span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedOldCustomer(false)}
                      className="text-[10px] text-sky-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Đổi khách hàng
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>45 Lê Lợi, Q. Hoàn Kiếm, Hà Nội</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sky-900 font-bold text-xs uppercase tracking-wide">
              <span>🔧</span>
              <span>Thông tin thiết bị & Sự cố</span>
            </div>
            {customerType === 'old' && (
              <button 
                type="button" 
                onClick={() => setIsAddingNewDevice(!isAddingNewDevice)}
                className="text-[10px] text-sky-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isAddingNewDevice ? (
                  <>
                    <X className="w-3 h-3" /> Chọn từ thiết bị đã có
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" /> Thêm thiết bị mới cho KH này
                  </>
                )}
              </button>
            )}
          </div>

          
          {customerType === 'old' && !isAddingNewDevice && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chọn từ thiết bị đã lưu của KH</label>
              <div className="relative">
                <select 
                  value={oldFormData.selectedDevice}
                  onChange={(e) => setOldFormData({ ...oldFormData, selectedDevice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
                >
                  <option>Xe lăn điện Karma KP-80 - SN: KM12345</option>
                  <option>Xe lăn cơ bản Karma Ergo - SN: K98765</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          
          {(customerType === 'new' || isAddingNewDevice) && (
            <div className="space-y-3 animate-fadeIn">
              {isAddingNewDevice && (
                <div className="bg-sky-50 text-sky-800 text-[11px] px-3 py-1.5 rounded-lg font-medium flex items-center justify-between">
                  <span>Đang thêm thiết bị hoàn toàn mới cho khách hàng này</span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại thiết bị</label>
                  <input
                    type="text"
                    placeholder="VD: Xe lăn điện"
                    value={customerType === 'new' ? newFormData.deviceType : oldFormData.deviceType}
                    onChange={(e) => customerType === 'new' 
                      ? setNewFormData({ ...newFormData, deviceType: e.target.value })
                      : setOldFormData({ ...oldFormData, deviceType: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thương hiệu / Model</label>
                  <input
                    type="text"
                    placeholder="VD: Karma KP-8..."
                    value={customerType === 'new' ? newFormData.brandModel : oldFormData.brandModel}
                    onChange={(e) => customerType === 'new' 
                      ? setNewFormData({ ...newFormData, brandModel: e.target.value })
                      : setOldFormData({ ...oldFormData, brandModel: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Serial / Số máy</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nhập hoặc quét mã..."
                    value={customerType === 'new' ? newFormData.serialNumber : oldFormData.serialNumber}
                    onChange={(e) => customerType === 'new' 
                      ? setNewFormData({ ...newFormData, serialNumber: e.target.value })
                      : setOldFormData({ ...oldFormData, serialNumber: e.target.value })
                    }
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sky-600 cursor-pointer">
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả sự cố / Yêu cầu của KH</label>
            <textarea
              rows={3}
              placeholder="Mô tả chi tiết tình trạng hư hỏng..."
              value={customerType === 'new' ? newFormData.description : oldFormData.description}
              onChange={(e) => customerType === 'new' 
                ? setNewFormData({ ...newFormData, description: e.target.value })
                : setOldFormData({ ...oldFormData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ảnh hiện trạng (Tối thiểu 1 ảnh)</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 hover:border-sky-500 cursor-pointer transition-colors bg-slate-50">
              <Camera className="w-5 h-5 mb-1 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-600">CHỤP ẢNH</span>
            </div>
          </div>
        </div>

        
        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-sky-900 hover:bg-sky-950 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-colors cursor-pointer"
          >
            <span>Tạo phiếu tiếp nhận mới</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </form>
    </div>
  );
};