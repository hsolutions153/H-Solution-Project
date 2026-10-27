-- Chặn một KTV xử lý nhiều đơn không có lịch hẹn cùng lúc.
-- Các đơn ASSIGNED cũ chưa nhận việc được giữ nguyên để không làm mất dữ liệu;
-- backend vẫn chặn không cho tạo thêm, còn database khóa từ lúc ACCEPTED.
alter table public.repair_requests
  add column if not exists appointment_key character varying(16);

create unique index if not exists uq_repair_requests_technician_active_unscheduled
  on public.repair_requests (technician_id)
  where technician_id is not null
    and appointment_key is null
    and status in (
      'ACCEPTED',
      'EN_ROUTE',
      'ARRIVED',
      'DIAGNOSING',
      'ESTIMATE_SUBMITTED',
      'WAITING_FOR_APPROVAL',
      'ESTIMATE_APPROVED',
      'ESTIMATE_REJECTED',
      'REPAIRING'
    );

-- Chặn cùng KTV nhận hai lịch cùng một khung giờ, kể cả khi hai request chạy
-- đồng thời và cùng vượt qua kiểm tra ở backend.
create unique index if not exists uq_repair_requests_technician_appointment_open
  on public.repair_requests (technician_id, appointment_key)
  where technician_id is not null
    and appointment_key is not null
    and status not in ('COMPLETED', 'CANCELLED');
