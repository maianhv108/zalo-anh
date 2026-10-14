// Trong trình duyệt (cả PC và điện thoại), dùng đường dẫn tương đối '/api/v1' 
// để Next.js tự động chuyển tiếp (proxy) sang cổng 4000 của backend, tránh lỗi 'localhost' và CORS trên điện thoại
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:4000/api/v1');

export class ApiError extends Error {
  statusCode: number;
  details: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sales_zalo_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401 && typeof window !== 'undefined' && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('sales_zalo_token');
      localStorage.removeItem('sales_zalo_user');
      window.location.href = '/login';
      throw new ApiError('Phiên đăng nhập đã hết hạn.', 401);
    }

    if (!res.ok) {
      let errJson: any = {};
      try {
        errJson = await res.json();
      } catch (e) {
        errJson = { message: res.statusText };
      }
      throw new ApiError(
        errJson.message || 'Đã có lỗi xảy ra',
        res.status,
        errJson.details,
      );
    }

    // Nếu là file download hoặc text
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      return (await res.text()) as any;
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Lỗi kết nối máy chủ API', 500);
  }
}
