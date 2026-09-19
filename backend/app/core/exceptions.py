from enum import Enum
from fastapi import HTTPException, status


class ErrorCode(str, Enum):
    UNAUTHORIZED = "UNAUTHORIZED"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_INVALID = "TOKEN_INVALID"
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    USER_LOCKED = "USER_LOCKED"
    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS"
    PHONE_ALREADY_EXISTS = "PHONE_ALREADY_EXISTS"
    OTP_INVALID = "OTP_INVALID"
    OTP_EXPIRED = "OTP_EXPIRED"
    ROLE_NOT_CONFIGURED = "ROLE_NOT_CONFIGURED"

    DEVICE_NOT_FOUND = "DEVICE_NOT_FOUND"
    INVALID_DEVICE_TYPE = "INVALID_DEVICE_TYPE"
    SERIAL_NUMBER_EXISTS = "SERIAL_NUMBER_EXISTS"
    DEVICE_ACCESS_DENIED = "DEVICE_ACCESS_DENIED"

    REQUEST_NOT_FOUND = "REQUEST_NOT_FOUND"
    INVALID_STATUS_TRANSITION = "INVALID_STATUS_TRANSITION"
    REQUEST_ALREADY_CANCELLED = "REQUEST_ALREADY_CANCELLED"
    REQUEST_ALREADY_COMPLETED = "REQUEST_ALREADY_COMPLETED"
    INVALID_ISSUE_TYPE = "INVALID_ISSUE_TYPE"
    INVALID_REQUEST_TYPE = "INVALID_REQUEST_TYPE"
    DUPLICATE_REQUEST = "DUPLICATE_REQUEST"

    TECHNICIAN_NOT_FOUND = "TECHNICIAN_NOT_FOUND"
    TECHNICIAN_NOT_ASSIGNED = "TECHNICIAN_NOT_ASSIGNED"
    TECHNICIAN_NOT_KYC_APPROVED = "TECHNICIAN_NOT_KYC_APPROVED"
    TECHNICIAN_OFFLINE = "TECHNICIAN_OFFLINE"
    ASSIGNMENT_FAILED = "ASSIGNMENT_FAILED"

    QUOTE_NOT_FOUND = "QUOTE_NOT_FOUND"
    QUOTE_ALREADY_EXISTS = "QUOTE_ALREADY_EXISTS"
    QUOTE_NOT_ACCEPTED = "QUOTE_NOT_ACCEPTED"
    QUOTE_ALREADY_DECIDED = "QUOTE_ALREADY_DECIDED"
    INVALID_QUOTE_STATUS = "INVALID_QUOTE_STATUS"
    INVALID_ITEM_TYPE = "INVALID_ITEM_TYPE"

    PAYMENT_NOT_FOUND = "PAYMENT_NOT_FOUND"
    PAYMENT_ALREADY_PAID = "PAYMENT_ALREADY_PAID"
    PAYMENT_AMOUNT_UNDETERMINED = "PAYMENT_AMOUNT_UNDETERMINED"
    PAYMENT_WEBHOOK_UNAUTHORIZED = "PAYMENT_WEBHOOK_UNAUTHORIZED"

    REVIEW_ALREADY_EXISTS = "REVIEW_ALREADY_EXISTS"
    INVALID_RATING_VALUE = "INVALID_RATING_VALUE"
    IMAGE_TYPE_UNSUPPORTED = "IMAGE_TYPE_UNSUPPORTED"
    IMAGE_SIZE_TOO_LARGE = "IMAGE_SIZE_TOO_LARGE"
    IMAGE_UPLOAD_FAILED = "IMAGE_UPLOAD_FAILED"

    VALIDATION_ERROR = "VALIDATION_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"


ERROR_METADATA: dict[ErrorCode, tuple[int, str]] = {
    ErrorCode.UNAUTHORIZED: (status.HTTP_401_UNAUTHORIZED, "Yêu cầu đăng nhập để tiếp tục"),
    ErrorCode.TOKEN_EXPIRED: (status.HTTP_401_UNAUTHORIZED, "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"),
    ErrorCode.TOKEN_INVALID: (status.HTTP_401_UNAUTHORIZED, "Token xác thực không hợp lệ"),
    ErrorCode.FORBIDDEN: (status.HTTP_403_FORBIDDEN, "Bạn không có quyền thực hiện thao tác này"),
    ErrorCode.INSUFFICIENT_PERMISSIONS: (status.HTTP_403_FORBIDDEN, "Quyền hạn không đủ để truy cập tài nguyên"),
    ErrorCode.INVALID_CREDENTIALS: (status.HTTP_400_BAD_REQUEST, "Email hoặc mật khẩu không chính xác"),
    ErrorCode.USER_NOT_FOUND: (status.HTTP_404_NOT_FOUND, "Không tìm thấy thông tin người dùng"),
    ErrorCode.USER_LOCKED: (status.HTTP_403_FORBIDDEN, "Tài khoản của bạn đã bị khóa"),
    ErrorCode.EMAIL_ALREADY_EXISTS: (status.HTTP_409_CONFLICT, "Địa chỉ email này đã được sử dụng"),
    ErrorCode.PHONE_ALREADY_EXISTS: (status.HTTP_409_CONFLICT, "Số điện thoại này đã được đăng ký"),
    ErrorCode.OTP_INVALID: (status.HTTP_400_BAD_REQUEST, "Mã OTP không chính xác"),
    ErrorCode.OTP_EXPIRED: (status.HTTP_400_BAD_REQUEST, "Mã OTP đã hết hạn"),
    ErrorCode.ROLE_NOT_CONFIGURED: (status.HTTP_500_INTERNAL_SERVER_ERROR, "Vai trò người dùng chưa được cấu hình"),

    ErrorCode.DEVICE_NOT_FOUND: (status.HTTP_404_NOT_FOUND, "Không tìm thấy thiết bị xe"),
    ErrorCode.INVALID_DEVICE_TYPE: (422, "Loại thiết bị không hợp lệ (chỉ chấp nhận WHEELCHAIR hoặc SCOOTER)"),
    ErrorCode.SERIAL_NUMBER_EXISTS: (status.HTTP_409_CONFLICT, "Số serial của thiết bị đã tồn tại trong hệ thống"),
    ErrorCode.DEVICE_ACCESS_DENIED: (status.HTTP_403_FORBIDDEN, "Bạn không sở hữu thiết bị xe này"),

    ErrorCode.REQUEST_NOT_FOUND: (status.HTTP_404_NOT_FOUND, "Không tìm thấy yêu cầu sửa chữa"),
    ErrorCode.INVALID_STATUS_TRANSITION: (status.HTTP_400_BAD_REQUEST, "Không thể chuyển sang trạng thái này từ trạng thái hiện tại"),
    ErrorCode.REQUEST_ALREADY_CANCELLED: (status.HTTP_409_CONFLICT, "Đơn yêu cầu sửa chữa đã bị hủy trước đó"),
    ErrorCode.REQUEST_ALREADY_COMPLETED: (status.HTTP_409_CONFLICT, "Đơn yêu cầu sửa chữa đã hoàn thành"),
    ErrorCode.INVALID_ISSUE_TYPE: (422, "Loại sự cố không hợp lệ"),
    ErrorCode.INVALID_REQUEST_TYPE: (422, "Loại yêu cầu không hợp lệ (chỉ nhận SOS hoặc GENERAL)"),
    ErrorCode.DUPLICATE_REQUEST: (status.HTTP_409_CONFLICT, "Bạn đã gửi một yêu cầu tương tự gần đây, vui lòng chờ xử lý"),

    ErrorCode.TECHNICIAN_NOT_FOUND: (status.HTTP_404_NOT_FOUND, "Không tìm thấy kỹ thuật viên"),
    ErrorCode.TECHNICIAN_NOT_ASSIGNED: (status.HTTP_403_FORBIDDEN, "Đơn sửa chữa này chưa được phân công cho bạn"),
    ErrorCode.TECHNICIAN_NOT_KYC_APPROVED: (status.HTTP_409_CONFLICT, "Hồ sơ kỹ thuật viên chưa được duyệt KYC"),
    ErrorCode.TECHNICIAN_OFFLINE: (status.HTTP_400_BAD_REQUEST, "Kỹ thuật viên hiện đang offline"),
    ErrorCode.ASSIGNMENT_FAILED: (status.HTTP_400_BAD_REQUEST, "Phân công kỹ thuật viên thất bại"),

    ErrorCode.QUOTE_NOT_FOUND: (status.HTTP_404_NOT_FOUND, "Không tìm thấy thông tin báo giá"),
    ErrorCode.QUOTE_ALREADY_EXISTS: (status.HTTP_409_CONFLICT, "Đơn này đã có báo giá được tạo"),
    ErrorCode.QUOTE_NOT_ACCEPTED: (status.HTTP_409_CONFLICT, "Cần khách hàng duyệt báo giá trước khi tiến hành sửa chữa"),
    ErrorCode.QUOTE_ALREADY_DECIDED: (status.HTTP_409_CONFLICT, "Báo giá này đã được phản hồi trước đó"),
    ErrorCode.INVALID_QUOTE_STATUS: (422, "Trạng thái báo giá không hợp lệ"),
    ErrorCode.INVALID_ITEM_TYPE: (422, "Loại mục báo giá không hợp lệ (chỉ chấp nhận SPARE_PART, LABOR hoặc SERVICE)"),

    ErrorCode.PAYMENT_NOT_FOUND: (status.HTTP_404_NOT_FOUND, "Không tìm thấy thông tin thanh toán"),
    ErrorCode.PAYMENT_ALREADY_PAID: (status.HTTP_409_CONFLICT, "Khoản thanh toán này đã được hoàn tất trước đó"),
    ErrorCode.PAYMENT_AMOUNT_UNDETERMINED: (status.HTTP_409_CONFLICT, "Chưa xác định được số tiền cần thanh toán, vui lòng chờ duyệt báo giá"),
    ErrorCode.PAYMENT_WEBHOOK_UNAUTHORIZED: (status.HTTP_401_UNAUTHORIZED, "Khóa xác thực Webhook SePay không hợp lệ"),

    ErrorCode.REVIEW_ALREADY_EXISTS: (status.HTTP_409_CONFLICT, "Đơn sửa chữa này đã được đánh giá trước đó"),
    ErrorCode.INVALID_RATING_VALUE: (422, "Số sao đánh giá phải từ 1 đến 5"),
    ErrorCode.IMAGE_TYPE_UNSUPPORTED: (415, "Định dạng hình ảnh không được hỗ trợ (chỉ nhận JPEG, PNG, WEBP)"),
    ErrorCode.IMAGE_SIZE_TOO_LARGE: (413, "Dung lượng ảnh vượt quá giới hạn cho phép"),
    ErrorCode.IMAGE_UPLOAD_FAILED: (status.HTTP_500_INTERNAL_SERVER_ERROR, "Tải ảnh lên hệ thống lưu trữ thất bại"),

    ErrorCode.VALIDATION_ERROR: (422, "Dữ liệu gửi lên không đúng định dạng"),
    ErrorCode.DATABASE_ERROR: (status.HTTP_500_INTERNAL_SERVER_ERROR, "Lỗi truy vấn cơ sở dữ liệu"),
    ErrorCode.INTERNAL_SERVER_ERROR: (status.HTTP_500_INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"),
}


class AppException(HTTPException):

    def __init__(
        self,
        code: ErrorCode,
        message: str | None = None,
        details: list | dict | None = None,
        headers: dict[str, str] | None = None,
    ):
        status_code, default_msg = ERROR_METADATA.get(code, (status.HTTP_400_BAD_REQUEST, "Đã xảy ra lỗi"))
        final_message = message or default_msg

        super().__init__(status_code=status_code, detail=final_message, headers=headers)
        self.error_code = status_code
        self.code = code.value
        self.message = final_message
        self.details = details
