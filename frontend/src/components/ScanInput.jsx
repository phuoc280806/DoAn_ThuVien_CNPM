import { Button, Form, InputGroup, Spinner } from 'react-bootstrap';

/**
 * Ô nhập mã (mã độc giả, mã bản sách) + nút. Bấm Enter cũng gửi,
 * nên dùng được với máy quét mã vạch dạng bàn phím.
 *
 *   <ScanInput value={code} onChange={setCode} onSubmit={find} placeholder="Quét hoặc nhập mã bản sách" />
 *
 * onSubmit nhận mã đã bỏ khoảng trắng và viết hoa.
 */
export default function ScanInput({
  id,
  value,
  onChange,
  onSubmit,
  placeholder,
  label,
  buttonLabel = 'Tìm',
  icon = 'search',
  busy = false,
  disabled = false,
  autoFocus = false,
  inputRef,
}) {
  function submit(e) {
    e.preventDefault();
    const code = value.trim().toUpperCase();
    if (code) onSubmit(code);
  }

  return (
    <Form onSubmit={submit} noValidate>
      {label && (
        <Form.Label htmlFor={id} className="small fw-medium">
          {label}
        </Form.Label>
      )}
      <InputGroup>
        <InputGroup.Text className="bg-white">
          <i className="bi bi-upc-scan text-secondary" />
        </InputGroup.Text>
        <Form.Control
          id={id}
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label || placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
        />
        <Button type="submit" disabled={busy || disabled || !value.trim()}>
          {busy ? <Spinner animation="border" size="sm" /> : <i className={`bi bi-${icon}`} />}
          <span className="ms-2">{buttonLabel}</span>
        </Button>
      </InputGroup>
    </Form>
  );
}
