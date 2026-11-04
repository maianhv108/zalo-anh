/**
 * Utility để sinh mã khách hàng tự động theo quy tắc:
 * 1. Khách hàng từ Zalo OA: Tiền tố luôn là "OA" (VD: OA0001, OA0002, OA0003...)
 * 2. Khách hàng do Sale phụ trách: Tiền tố = Viết tắt tên Nhân viên Sale (VD: "Tiểu Nhã" -> "TN0001", "Mai Anh" -> "MA0001")
 * 3. Khách hàng vãng lai chưa gán Sale: Tiền tố mặc định là "KH" (VD: KH0001, KH0002)
 */

export function getSaleCodePrefix(saleName?: string | null, source?: string | null): string {
  // Nếu nguồn khách là Zalo OA hoặc saleName là OA -> Mã khách hàng luôn là OA...
  if (
    (source && source.toUpperCase().includes('OA')) ||
    (saleName && saleName.trim().toUpperCase() === 'OA')
  ) {
    return 'OA';
  }

  if (!saleName || !saleName.trim()) {
    return 'KH';
  }

  // Loại bỏ dấu tiếng Việt
  const cleanName = saleName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim();

  const words = cleanName.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return 'KH';
  }

  if (words.length === 1) {
    return words[0].substring(0, Math.min(2, words[0].length)).toUpperCase();
  }

  // Lấy chữ cái đầu tiên của từng từ viết hoa
  // Ví dụ: "Tiểu Nhã" -> "TN", "Mai Anh" -> "MA", "Nguyễn Văn An" -> "NVA"
  const initials = words.map((w) => w[0].toUpperCase()).join('');
  return initials;
}

export async function generateCustomerCode(
  prismaOrTx: any,
  saleName?: string | null,
  source?: string | null,
): Promise<string> {
  const prefix = getSaleCodePrefix(saleName, source);

  // Tìm tất cả các mã khách hàng bắt đầu bằng tiền tố này
  const existingCustomers = await prismaOrTx.customer.findMany({
    where: {
      code: {
        startsWith: prefix,
      },
    },
    select: {
      code: true,
    },
  });

  let maxNumber = 0;
  for (const item of existingCustomers) {
    if (!item.code) continue;
    const numStr = item.code.slice(prefix.length);
    if (/^\d+$/.test(numStr)) {
      const num = parseInt(numStr, 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  const nextNumber = maxNumber + 1;
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}
