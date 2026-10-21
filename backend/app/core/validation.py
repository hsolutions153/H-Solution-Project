"""Shared validation for API input; response and signed webhook data stay untouched."""
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Annotated, ClassVar

from pydantic import (
    AfterValidator, BaseModel, BeforeValidator, ConfigDict, EmailStr,
    Field, StringConstraints, TypeAdapter, HttpUrl, field_validator,
)

VN_TZ = timezone(timedelta(hours=7))
MAX_MONEY = Decimal("999999999999")  # NUMERIC(12, 0), VND


def not_boolean(value):
    if isinstance(value, bool):
        raise ValueError("Giá trị phải là số, không phải boolean")
    return value


def empty_to_none(value):
    return None if isinstance(value, str) and not value.strip() else value


def password_bytes(value: str) -> str:
    if not value.strip() or len(value.encode("utf-8")) > 72:
        raise ValueError("Mật khẩu không được trống và không được vượt quá 72 byte UTF-8")
    return value


_http_url = TypeAdapter(HttpUrl)


def http_url(value: str) -> str:
    # Keep a plain string (and its spelling) for JSON/database clients.
    if any(char.isspace() for char in value):
        raise ValueError("URL không được chứa khoảng trắng")
    parsed = _http_url.validate_python(value)
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("URL không được chứa thông tin đăng nhập")
    return value


def single_line(value: str) -> str:
    if any(ord(char) < 32 for char in value):
        raise ValueError("Trường này không được chứa ký tự xuống dòng hoặc điều khiển")
    return value


Identifier = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10, pattern=r"^[A-Za-z0-9_-]+$")]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100), AfterValidator(single_line)]
Phone = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^0[35789][0-9]{8}$", min_length=10, max_length=10)]
OptionalPhone = Annotated[Phone | None, BeforeValidator(empty_to_none)]
Email = Annotated[EmailStr, Field(max_length=100), AfterValidator(str.lower)]
OptionalEmail = Annotated[Email | None, BeforeValidator(empty_to_none)]
Password = Annotated[str, Field(min_length=8, max_length=72), AfterValidator(password_bytes)]
LoginPassword = Annotated[str, Field(min_length=1, max_length=72), AfterValidator(password_bytes)]
Url = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500), AfterValidator(http_url)]
OptionalUrl = Annotated[Url | None, BeforeValidator(empty_to_none)]
Address = Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)]
Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)]
Reason = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]
Money = Annotated[Decimal, BeforeValidator(not_boolean), Field(ge=0, le=MAX_MONEY, max_digits=12, decimal_places=0, allow_inf_nan=False)]
Quantity = Annotated[Decimal, BeforeValidator(not_boolean), Field(gt=0, le=Decimal("99999999.99"), max_digits=10, decimal_places=2, allow_inf_nan=False)]
Latitude = Annotated[Decimal, BeforeValidator(not_boolean), Field(ge=-90, le=90, allow_inf_nan=False)]
Longitude = Annotated[Decimal, BeforeValidator(not_boolean), Field(ge=-180, le=180, allow_inf_nan=False)]
Experience = Annotated[int, BeforeValidator(not_boolean), Field(ge=0, le=32767)]
AccountNumber = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50, pattern=r"^[0-9]+$")]
BankCode = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20, pattern=r"^[A-Za-z0-9]+$")]


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    non_nullable_fields: ClassVar[set[str]] = set()

    @field_validator("*", mode="before")
    @classmethod
    def normalize_input(cls, value, info):
        if value is None and info.field_name in cls.non_nullable_fields:
            raise ValueError("Trường này không được nhận null")
        if isinstance(value, str):
            if any(ord(char) < 32 and char not in "\n\r\t" for char in value):
                raise ValueError("Dữ liệu chứa ký tự điều khiển không hợp lệ")
            # Never trim credentials: leading/trailing spaces can be intentional.
            if info.field_name not in {"password", "new_password", "id_token"}:
                value = value.strip()
        return value

    @field_validator("*", mode="after")
    @classmethod
    def reject_normalized_null(cls, value, info):
        if value is None and info.field_name in cls.non_nullable_fields:
            raise ValueError("Trường này không được để trống")
        return value


def choice(values: set[str], *, uppercase=True):
    def normalize(value):
        if isinstance(value, str):
            value = value.strip()
            return value.upper() if uppercase else value
        return value

    def validate(value):
        if value not in values:
            raise ValueError(f"Giá trị hợp lệ: {', '.join(sorted(values))}")
        return value

    return Annotated[str, BeforeValidator(normalize), Field(min_length=1, max_length=50), AfterValidator(validate)]


def validate_coordinates(latitude, longitude, *, required=False):
    if required and (latitude is None or longitude is None):
        raise ValueError("Vui lòng cung cấp đủ vĩ độ và kinh độ GPS")
    if (latitude is None) != (longitude is None):
        raise ValueError("Vị trí GPS phải có đủ cả vĩ độ và kinh độ")


def validate_aliases(model, *groups):
    for group in groups:
        values = [getattr(model, name) for name in group if getattr(model, name) is not None]
        if values and any(value != values[0] for value in values[1:]):
            raise ValueError(f"Các trường {', '.join(group)} phải có cùng giá trị")


def validated_payload(schema, data, *, partial=False):
    """Apply the API contract to direct/internal service calls as well."""
    from pydantic import ValidationError
    from app.core.exceptions import AppException, ErrorCode

    raw = data.model_dump(exclude_unset=True) if isinstance(data, BaseModel) else data
    try:
        model = schema.model_validate(raw)
    except ValidationError as error:
        details = [{"field": ".".join(map(str, item["loc"])) or "root",
                    "message": item["msg"], "type": item["type"]} for item in error.errors()]
        raise AppException(ErrorCode.VALIDATION_ERROR, details=details) from error
    return model.model_dump(exclude_unset=partial, mode="json")


def validate_booking(booking_date: str | None, booking_slot: str | None):
    if not booking_date:
        if booking_slot:
            raise ValueError("Cần chọn ngày khi đặt giờ hẹn")
        return
    now = datetime.now(VN_TZ)
    if booking_date in {"TODAY", "TOMORROW"}:
        booking_day = now.date() + timedelta(days=booking_date == "TOMORROW")
    else:
        try:
            booking_day = date.fromisoformat(booking_date)
            if booking_day.isoformat() != booking_date:
                raise ValueError
        except ValueError:
            raise ValueError("Ngày hẹn phải có định dạng YYYY-MM-DD, TODAY hoặc TOMORROW") from None
    slot = time(23, 59, 59)
    if booking_slot:
        try:
            slot = datetime.strptime(booking_slot, "%H:%M").time()
            if slot.strftime("%H:%M") != booking_slot:
                raise ValueError
        except ValueError:
            raise ValueError("Giờ hẹn phải có định dạng HH:MM hợp lệ") from None
    if datetime.combine(booking_day, slot, tzinfo=VN_TZ) < now:
        raise ValueError("Thời gian đặt lịch đã ở trong quá khứ")
