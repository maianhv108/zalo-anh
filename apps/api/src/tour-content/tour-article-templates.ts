/**
 * Dữ liệu và kịch bản biên soạn nội dung Zalo OA chuẩn 100% theo Google Sheet & Google Drive
 * Bám sát định vị "Úc Dễ Hiểu Cùng TourLuk", từng đối tượng khách hàng và điểm đến.
 * Tùy độ dài bài viết để bố trí 1 ảnh (bài ngắn) hoặc 2-3 ảnh (bài dài) xen kẽ trong thân bài.
 */

export interface ArticleBlueprint {
  id: string;
  hook: string;
  lead: string;
  sections: {
    heading?: string;
    text: string;
    imageIndex?: number; // Vị trí ảnh galleryImages (0, 1, 2)
    imageCaption?: string;
  }[];
  cta: string;
  hashtags: string[];
}

export const TOUR_ARTICLE_BLUEPRINTS: Record<string, ArticleBlueprint> = {
  // =========================================================================
  // BÀI 1 (ZA-001): Định vị thương hiệu Úc Dễ Hiểu Cùng TourLuk
  // Phân khúc: Cả 3 nhóm khách | Độ dài: Trung bình | Số ảnh xen kẽ: 2 ảnh
  // =========================================================================
  'ZA-001': {
    id: 'ZA-001',
    hook: `🌟 Bạn ấp ủ giấc mơ khám phá nước Úc nhưng lo lắng thủ tục phức tạp, chi phí mập mờ và lịch trình quá tải? Đã đến lúc trải nghiệm du lịch hoàn toàn khác biệt cùng TourLuk!`,
    lead: `✨ Dành riêng cho người Việt từ trong nước sang, kiều bào đang sinh sống tại Úc hay du khách đang có mặt tại Úc muốn tìm kiếm chuyến đi an tâm, thoải mái nhất.`,
    sections: [
      {
        heading: `💡 VÌ SAO ĐI ÚC CÙNG TOURLUK LẠI "DỄ HIỂU" HƠN?`,
        text: `Du lịch nước Úc là hành trình mơ ước của nhiều gia đình, nhưng rào cản lớn nhất thường là khoảng cách địa lý rộng lớn, khác biệt văn hóa, thủ tục visa khắt khe và nỗi lo bị phát sinh chi phí. Thấu hiểu điều đó, TourLuk ra đời với cam kết duy nhất: Đem đến cho bạn chuyến đi "Dễ hiểu – Vừa sức – Trọn vẹn từng khoảnh khắc".`,
        imageIndex: 0,
        imageCaption: `Bờ vịnh Sydney tuyệt đẹp và không gian thoáng đãng đón chào du khách Việt Nam.`,
      },
      {
        heading: `💎 3 CAM KẾT KHÁC BIỆT TỪ TOURLUK:`,
        text: `1. Lịch trình may đo khoa học: Không "nhồi nhét" chạy sô điểm đến. Mỗi ngày chỉ tập trung 2-3 điểm nhấn đắt giá, có thời gian nghỉ ngơi, uống cà phê và chụp ảnh kỷ niệm.\n2. Hướng dẫn viên người Việt bản địa: Nhiệt huyết, tận tâm, am hiểu sâu sắc văn hóa địa phương và sẵn sàng chăm sóc chu đáo từ người lớn tuổi đến các em nhỏ.\n3. Minh bạch 100% chi phí: Mọi thông tin về vé tham quan, bữa ăn, khách sạn và phương tiện di chuyển đều được công khai rõ ràng, cam kết không phụ thu bất ngờ.`,
        imageIndex: 1,
        imageCaption: `Không gian phố cổ The Rocks cổ kính với những quán cà phê ngập tràn nắng ấm.`,
      },
      {
        heading: `🎯 ĐỒNG HÀNH TOÀN DIỆN CHO MỌI CHẶNG ĐƯỜNG:`,
        text: `Dù bạn khởi hành từ Hà Nội, TP.HCM hay cần dịch vụ đón trả tận nơi tại Sydney, Melbourne, Brisbane hay Perth – TourLuk luôn có giải pháp tour linh hoạt, phù hợp hoàn hảo với mong muốn của bạn và gia đình.`,
      },
    ],
    cta: `NHẬN TƯ VẤN LỊCH TRÌNH VÀ BÁO GIÁ ƯU ĐÃI MIỄN PHÍ`,
    hashtags: ['TourLuk', 'DuLichUc', 'UcDeHieu', 'KhamPhaUc', 'TourUcTronGoi', 'ZaloOA'],
  },

  // =========================================================================
  // BÀI 2 (ZA-002): Checklist đi Úc lần đầu
  // Phân khúc: Khách từ VN / Người đi lần đầu | Độ dài: Dài | Số ảnh xen kẽ: 2 ảnh
  // =========================================================================
  'ZA-002': {
    id: 'ZA-002',
    hook: `✈️ Chỉ còn vài ngày nữa là khởi hành sang xứ sở chuột túi nhưng bạn vẫn chưa rõ quy định hải quan Úc, tiền tệ hay di chuyển? Lưu ngay cẩm nang kiểm tra thực tế này!`,
    lead: `✨ Dành riêng cho du khách Việt Nam lần đầu đặt chân đến Úc: Chuẩn bị kỹ càng sẽ giúp chuyến đi của bạn suôn sẻ và thảnh thơi từ phút đầu tiên.`,
    sections: [
      {
        heading: `📋 1. HỒ SƠ GIẤY TỜ & THỦ TỤC NHẬP CẢNH`,
        text: `• Hộ chiếu còn hạn trên 6 tháng tính từ ngày kết thúc chuyến đi.\n• Bản in thị thực (Visa Úc subclass 600) và vé máy bay khứ hồi.\n• Tờ khai nhập cảnh (Incoming Passenger Card): Sẽ được tiếp viên phát trên máy bay. Bạn cần điền trung thực 100% mọi thông tin, đặc biệt là mục hành lý mang theo.`,
        imageIndex: 0,
        imageCaption: `Sân bay quốc tế Úc với quy trình hải quan và kiểm dịch sinh học nghiêm ngặt bậc nhất thế giới.`,
      },
      {
        heading: `⚠️ 2. QUY ĐỊNH HẢI QUAN ÚC SIÊU NGHIÊM NGẶT (TUYỆT ĐỐI LƯU Ý)`,
        text: `Hải quan Úc nổi tiếng khắt khe về an toàn sinh học. Bạn TUYỆT ĐỐI KHÔNG mang:\n❌ Tất cả các loại thịt tươi, thịt khô (thịt bò khô, chà bông, lạp xưởng, xúc xích...).\n❌ Trứng và các sản phẩm chứa trứng (kể cả bánh trung thu nhân trứng muối).\n❌ Trái cây tươi, rau củ và các loại hạt giống chưa qua chế biến.\n👉 Lời khuyên vàng: Nếu mang thuốc cá nhân hoặc đồ ăn liền có nhãn mác rõ ràng, hãy tích chọn "YES" trên tờ khai để hải quan kiểm tra nhanh chóng, tránh bị phạt tiền lên đến hàng nghìn đô Úc.`,
      },
      {
        heading: `💳 3. TIỀN TỆ, THẺ NGÂN HÀNG & SIM KẾT NỐI`,
        text: `• Nước Úc gần như 100% không dùng tiền mặt: Chỉ cần 1 thẻ Visa hoặc Mastercard (chạm PayWave) là thanh toán được từ cốc cà phê đến vé xe buýt. Bạn chỉ nên đổi khoảng 100 - 200 AUD tiền mặt dự phòng.\n• SIM 4G: Nên chọn mạng Telstra hoặc Optus có độ phủ sóng rộng khắp, dung lượng data dồi dào để thoải mái gọi Zalo về cho gia đình.`,
        imageIndex: 1,
        imageCaption: `Góc phố trung tâm hiện đại tại Úc nơi mọi thanh toán đều thực hiện tiện lợi qua thẻ chạm PayWave.`,
      },
      {
        heading: `👗 4. THỜI TIẾT & TRANG PHỤC THÔNG MINH`,
        text: `Nước Úc nằm ở Nam bán cầu nên mùa sẽ ngược hoàn toàn với Việt Nam (Mùa hè: Tháng 12 - Tháng 2; Mùa thu: Tháng 3 - Tháng 5; Mùa đông: Tháng 6 - Tháng 8). Hãy áp dụng phong cách mặc "layering" (áo thun + áo khoác nhẹ) để dễ dàng thích nghi với biên độ nhiệt ngày và đêm.`,
      },
    ],
    cta: `LƯU LẠI CHECKLIST & NHẬN HỖ TRỢ TƯ VẤN TỪ CHUYÊN VIÊN TOURLUK`,
    hashtags: ['TourLuk', 'ChecklistDiUc', 'KinhNghiemDiUc', 'HaiQuanUc', 'DuLichUcLanDau'],
  },

  // =========================================================================
  // BÀI 3 (ZA-003): Một gia đình hoàn thành tour Sydney
  // Phân khúc: Gia đình có người lớn tuổi & trẻ nhỏ | Độ dài: Dài | Số ảnh: 3 ảnh
  // =========================================================================
  'ZA-003': {
    id: 'ZA-003',
    hook: `👨‍👩‍👧‍👦 Đi Sydney cùng cả gia đình có bố mẹ lớn tuổi và trẻ nhỏ: Làm sao để vừa check-in đủ các biểu tượng nổi tiếng vừa giữ sức khỏe thoải mái cho cả nhà?`,
    lead: `✨ Câu chuyện thực tế từ gia đình anh Hoàng (Hà Nội, 3 thế hệ đi cùng bố mẹ 68 tuổi và bé 6 tuổi) đã hoàn thành trọn vẹn chuyến du ngoạn Sydney 4N3Đ cùng TourLuk.`,
    sections: [
      {
        heading: `🌅 BUỔI SÁNG: NGẮM VỊNH SYDNEY & NHÀ HÁT CON SÒ THỜI ĐIỂM ĐẸP NHẤT`,
        text: `Bắt đầu ngày mới lúc 8:30 sáng khi nắng mai vừa rọi xuống vịnh Circular Quay trong trẻo. Xe đón gia đình ngay tại sảnh khách sạn trung tâm. Bố mẹ anh Hoàng có thể thong thả tản bộ dọc cầu cảng, hít hà gió biển tươi mát mà không bị chen lấn bởi các đoàn khách đông đúc.`,
        imageIndex: 0,
        imageCaption: `Vịnh Circular Quay và Nhà hát Con Sò Sydney Opera House rực rỡ dưới ánh nắng ban mai.`,
      },
      {
        heading: `☕ BUỔI TRƯA: THƯỞNG THỨC CÀ PHÊ TẠI PHỐ CỔ THE ROCKS`,
        text: `Thay vì bắt khách chạy vội sang điểm tiếp theo, HDV TourLuk sắp xếp bữa trưa ấm cúng tại nhà hàng ven phố cổ The Rocks. Bố mẹ được nhâm nhi tách cà phê ngắm nhìn Cầu Cảng Sydney Harbour hùng vĩ, trong khi bé con hào hứng ngắm các nghệ sĩ đường phố biểu diễn đàn violin.`,
        imageIndex: 1,
        imageCaption: `Con phố đá cuội cổ kính The Rocks đậm đà phong vị châu Âu giữa lòng Sydney.`,
      },
      {
        heading: `🌊 BUỔI CHIỀU: ĐÓN GIÓ BIỂN BONDI & COOGEE CÁT TRẮNG MỊN`,
        text: `Buổi chiều là khoảng thời gian thư thái nhất tại bãi biển Coogee và Bondi. Không cần phải đi bộ trekking quá sức, xe đưa gia đình đến thẳng điểm ngắm cảnh biển đẹp nhất để cả nhà cùng chụp bức ảnh đại gia đình 3 thế hệ làm kỷ niệm để đời.`,
        imageIndex: 2,
        imageCaption: `Làn nước xanh biếc và bãi cát thoai thoải tại biển Coogee rất thích hợp cho gia đình thư giãn.`,
      },
      {
        heading: `💬 CHIA SẺ TỪ ANH HOÀNG SAU TOUR:`,
        text: `"Điều làm tôi hài lòng nhất là TourLuk hiểu rất rõ sức khỏe của người lớn tuổi. Xe đưa đón tận cửa, không phải leo dốc hay đi bộ quá 15 phút một lần. Bố mẹ tôi về khen mãi chuyến đi nhẹ nhàng, khỏe khoắn!"`,
      },
    ],
    cta: `XEM LỊCH TRÌNH CHI TIẾT TOUR SYDNEY THIẾT KẾ RIÊNG CHO GIA ĐÌNH`,
    hashtags: ['TourLuk', 'SydneyFamilyTour', 'DuLichSydney', 'TourGiaDinh', 'NhaHatConSo'],
  },

  // =========================================================================
  // BÀI 4 (ZA-004): So sánh Melbourne hay Sydney
  // Phân khúc: Khách lần đầu / Cặp đôi / Gia đình | Độ dài: Dài | Số ảnh: 3 ảnh
  // =========================================================================
  'ZA-004': {
    id: 'ZA-004',
    hook: `🏙️ Sydney hoa lệ bên vịnh biển lộng gió hay Melbourne cổ kính ngập tràn văn hóa cà phê: Thành phố nào sẽ là điểm dừng chân lý tưởng nhất cho bạn?`,
    lead: `✨ Dành riêng cho bạn đang phân vân lựa chọn điểm đến cho kỳ nghỉ sắp tới tại Úc: Đặt lên bàn cân 2 thành phố nổi tiếng nhất để tìm ra nơi hợp "gu" nhất!`,
    sections: [
      {
        heading: `💎 SYDNEY: THIÊN ĐƯỜNG CHECK-IN & BIỂU TƯỢNG TOÀN CẦU`,
        text: `• Không khí: Năng động, hiện đại, rực rỡ và luôn tràn ngập ánh nắng biển.\n• Trải nghiệm nổi bật: Du thuyền ngắm vịnh cảng Circular Quay, check-in Nhà hát Con Sò, bãi biển Bondi sôi động và phố cổ The Rocks cổ kính.\n• Hợp với ai: Những ai yêu thích vịnh biển, muốn chụp những bức ảnh biểu tượng thế giới và thích nhịp sống tươi vui, tràn đầy năng lượng.`,
        imageIndex: 0,
        imageCaption: `Sydney rực rỡ bên bờ vịnh với những biểu tượng kiến trúc lừng danh thế giới.`,
      },
      {
        heading: `🍁 MELBOURNE: THỦ PHỦ VĂN HÓA, NGHỆ THUẬT & CÀ PHÊ`,
        text: `• Không khí: Lãng mạn, trầm mặc, mang phong cách kiến trúc châu Âu cổ điển.\n• Trải nghiệm nổi bật: Lạc vào những con ngõ nghệ thuật Graffiti Lane đầy màu sắc, nhâm nhi tách cà phê Flat White thơm nồng, dạo bước vườn Fitzroy Gardens và chinh phục cung đường Great Ocean Road kỳ vĩ.\n• Hợp với ai: Các cặp đôi, người yêu nghệ thuật, thích sự yên bình, sâu lắng và ẩm thực tinh tế.`,
        imageIndex: 1,
        imageCaption: `Con ngõ Hosier Lane ngập tràn các tác phẩm graffiti sáng tạo đặc trưng của Melbourne.`,
      },
      {
        heading: `🚗 LƯU Ý KHI ĐI GREAT OCEAN ROAD (MELBOURNE):`,
        text: `Cung đường biển Great Ocean Road và cụm đá Mười Hai Tông Đồ (12 Apostles) đẹp mê hồn nhưng thời gian ngồi xe khứ hồi từ Melbourne khoảng 5-6 tiếng. Với tour TourLuk, xe luôn ngắt chặng khoa học tại thị trấn ven biển Lorne và Apollo Bay để khách vừa ngắm cảnh vừa duỗi chân thoải mái.`,
        imageIndex: 2,
        imageCaption: `Kỳ quan thiên nhiên 12 Vị Tông Đồ (12 Apostles) sừng sững bên bờ sóng bạc đầu tại Victoria.`,
      },
      {
        heading: `👉 LỰA CHỌN TỐI ƯU NHẤT:`,
        text: `Nếu bạn có từ 7 đến 8 ngày, giải pháp hoàn hảo nhất là chọn tour liên tuyến Sydney - Melbourne của TourLuk để thưởng thức trọn vẹn cả hai phong cách đối lập mà cuốn hút này!`,
      },
    ],
    cta: `NHẬN BẢNG SO SÁNH CHI PHÍ VÀ LỊCH TRÌNH LIÊN TUYẾN SYDNEY - MELBOURNE`,
    hashtags: ['TourLuk', 'SydneyVsMelbourne', 'GreatOceanRoad', 'DuLichMelbourne', 'DuLichUc'],
  },

  // =========================================================================
  // BÀI 5 (ZA-005): Brisbane và Gold Coast
  // Phân khúc: Gia đình có con nhỏ / Khách thích biển | Độ dài: Trung bình | Số ảnh: 2 ảnh
  // =========================================================================
  'ZA-005': {
    id: 'ZA-005',
    hook: `🏖️ Trốn cái lạnh mùa đông, đón nắng ấm rực rỡ tại Queensland: Nên chọn Brisbane êm đềm bên sông hay thiên đường biển Gold Coast sôi động?`,
    lead: `✨ Cẩm nang thực tế dành cho các gia đình có trẻ nhỏ và du khách yêu thích bãi cát vàng nắng ấm quanh năm tại bang Queensland (Úc).`,
    sections: [
      {
        heading: `🏙️ BRISBANE: THÀNH PHỐ BỜ SÔNG HIỆN ĐẠI & TRẺ TRUNG`,
        text: `Brisbane là thủ phủ bang Queensland, nổi tiếng với nhịp sống thư thái bên bờ sông uốn lượn. Bạn nhất định phải thử:\n• Trải nghiệm đi phà CityCat ngắm trọn vẹn đường chân trời thành phố.\n• Dạo bước khu văn hóa South Bank với bãi biển nhân tạo giữa lòng đô thị mát rượi, an toàn tuyệt đối cho các bé vui chơi.`,
        imageIndex: 0,
        imageCaption: `Khu phức hợp công viên và bãi biển nhân tạo South Bank nổi tiếng tại trung tâm Brisbane.`,
      },
      {
        heading: `🎢 GOLD COAST: THIÊN ĐƯỜNG CỦA BIỂN VÀ CÔNG VIÊN GIẢI TRÍ THEME PARKS`,
        text: `Chỉ cách Brisbane 1 giờ lái xe, Gold Coast là điểm hẹn số 1 của các gia đình có con nhỏ:\n• Bãi biển Surfers Paradise trải dài hàng chục kilomet với cát vàng óng ánh và sóng biển lý tưởng.\n• Hệ thống công viên chủ đề đẳng cấp quốc tế: Warner Bros. Movie World, Sea World và Dreamworld – nơi các bé thỏa sức gặp gỡ siêu nhân, xem xiếc cá heo và trải nghiệm tàu lượn siêu tốc.`,
        imageIndex: 1,
        imageCaption: `Bãi biển Surfers Paradise dài ngút ngàn với những đợt sóng bạc đầu và nắng vàng quanh năm.`,
      },
      {
        heading: `💡 NÊN Ở ĐÂU VÀ ĐI MẤY NGÀY?`,
        text: `Lịch trình lý tưởng nhất là 4N3Đ hoặc 5N4Đ. Bạn nên đặt khách sạn tại Gold Coast để tiện tắm biển và đi chơi công viên, sau đó dành 1 ngày trọn vẹn khám phá Brisbane trước khi ra sân bay.`,
      },
    ],
    cta: `XEM GÓI TOUR QUEENSLAND MAY ĐO CHO GIA ĐÌNH CÓ TRẺ EM`,
    hashtags: ['TourLuk', 'GoldCoast', 'Brisbane', 'QueenslandTour', 'DuLichGiaDinh'],
  },

  // =========================================================================
  // BÀI 6 (ZA-006): Perth 4 ngày
  // Phân khúc: Khách thích thiên nhiên / Cặp đôi / Việt kiều | Độ dài: Trung bình | Số ảnh: 2 ảnh
  // =========================================================================
  'ZA-006': {
    id: 'ZA-006',
    hook: `🦘 Nếu bạn đã đi quen bờ Đông nước Úc, hãy để Perth (Tây Úc) chinh phục bạn với làn nước biển xanh ngọc, đàn Quokka đáng yêu và khung cảnh thiên nhiên nguyên sơ!`,
    lead: `✨ Hành trình 4 ngày 3 đêm khám phá thành phố nhiều giờ nắng nhất nước Úc dành cho những tâm hồn mê xê dịch và thiên nhiên nguyên bản.`,
    sections: [
      {
        heading: `🌿 NGÀY 1 & 2: THÀNH PHỐ PERTH & THIÊN ĐƯỜNG ĐẢO ROTTNEST`,
        text: `• Chiêm ngưỡng toàn cảnh Perth và dòng sông Swan thơ mộng từ Công viên Kings Park – một trong những công viên nội đô lớn nhất thế giới.\n• Lên phà cao tốc sang Đảo Rottnest: Thuê một chiếc xe đạp sinh thái dạo quanh các vịnh biển vắng người và chụp bức ảnh selfie huyền thoại cùng loài chuột túi Quokka siêu thân thiện – "động vật hạnh phúc nhất hành tinh"!`,
        imageIndex: 0,
        imageCaption: `Góc nhìn ngoạn mục từ đài quan sát công viên Kings Park ôm trọn trung tâm thành phố Perth.`,
      },
      {
        heading: `⛵ NGÀY 3 & 4: CẢNG CỔ FREMANTLE & SA MẠC ĐÁ PINNACLES`,
        text: `• Lạc bước giữa thị trấn cổ kính Fremantle: Thưởng thức món cá chiên Fish & Chips trứ danh tại bến cảng thuyền buồm và dạo chợ cuối tuần.\n• Khám phá sa mạc đá vôi Pinnacles kỳ bí tại Công viên Quốc gia Nambung: Hàng nghìn cột đá vôi nhô lên giữa cát vàng tạo nên cảnh tượng như trên bề mặt sao Hỏa.`,
        imageIndex: 1,
        imageCaption: `Khung cảnh bình yên của bến du thuyền Fremantle và vùng biển xanh thẳm miền Tây Úc.`,
      },
      {
        heading: `📌 ĐIỂM CỘNG LỚN KHI ĐI PERTH:`,
        text: `Perth có múi giờ cùng giờ với Việt Nam (hoặc chỉ lệch 1 tiếng vào mùa hè), thời tiết khô ráo, trong lành, không bị mệt mỏi vì jet lag – cực kỳ phù hợp cho chuyến nghỉ dưỡng tái tạo năng lượng.`,
      },
    ],
    cta: `NHẬN LỊCH TRÌNH TOUR PERTH 4N3Đ TRỌN GÓI VÀ ĐẶT CHỖ SỚM`,
    hashtags: ['TourLuk', 'PerthWesternAustralia', 'RottnestIsland', 'QuokkaSelfie', 'DuLichTayUc'],
  },

  // =========================================================================
  // BÀI 7 (ZA-007): Tour cho gia đình nhiều thế hệ
  // Phân khúc: Gia đình nhiều thế hệ / Người lớn tuổi | Độ dài: Trung bình | Số ảnh: 2 ảnh
  // =========================================================================
  'ZA-007': {
    id: 'ZA-007',
    hook: `❤️ "Chuyến đi tuyệt vời nhất không phải là đi được nhiều nơi nhất, mà là khi ông bà và các cháu đều có những nụ cười trọn vẹn suốt dọc đường."`,
    lead: `✨ Bí quyết thiết kế lịch trình "vừa sức – thong thả – chuẩn gu" cho các gia đình 3 thế hệ cùng khám phá nước Úc.`,
    sections: [
      {
        heading: `👵 1. NHỊP ĐỘ DI CHUYỂN: CHẬM RÃI VÀ THONG THẢ`,
        text: `Người lớn tuổi thường nhanh mỏi khớp gối, còn trẻ nhỏ thì dễ cáu gắt khi phải đi bộ liên tục. TourLuk áp dụng nguyên tắc "1 buổi – 1 trải nghiệm chính". Giữa các điểm tham quan luôn có khoảng nghỉ 30-45 phút tại quán cà phê thoáng mát hoặc ghế nghỉ công viên ven biển.`,
        imageIndex: 0,
        imageCaption: `Không gian công viên rợp bóng cây xanh mát giúp các thế hệ trong gia đình thảnh thơi dạo bước.`,
      },
      {
        heading: `🚌 2. XE ĐÓN TẬN SẢNH KHÁCH SẠN – KHÔNG LO PHƯƠNG TIỆN CÔNG CỘNG`,
        text: `Tàu điện ngầm hay xe buýt tại Úc rất hiện đại nhưng lại đòi hỏi phải đi bộ qua các ga ngầm dài và cầu thang cuốn dốc. Đi tour cùng TourLuk, xe du lịch đời mới đưa đón gia đình tận cửa khách sạn, khoang hành lý rộng rãi, xe có điều hòa êm ái giúp ông bà giữ trọn năng lượng suốt ngày dài.`,
        imageIndex: 1,
        imageCaption: `Phương tiện xe đưa đón riêng chất lượng cao tạo sự tiện lợi tối đa cho gia đình có trẻ em và người già.`,
      },
      {
        heading: `🍲 3. BỮA ĂN HỢP KHẨU VỊ NGƯỜI VIỆT`,
        text: `Thực đơn được cân đối khoa học: Đan xen các món ăn nhẹ nhàng, canh nóng, cơm Việt hợp khẩu vị người lớn tuổi với các bữa tiệc hải sản tươi ngon, bít tết bò Úc để các bạn trẻ thưởng thức ẩm thực bản địa.`,
      },
    ],
    cta: `TƯ VẤN LỊCH TRÌNH RIÊNG CHO ĐOÀN GIA ĐÌNH CỦA BẠN`,
    hashtags: ['TourLuk', 'TourGiaDinhNhieuTheHe', 'DuLichCungOngBa', 'DuLichUcAnToan'],
  },

  // =========================================================================
  // BÀI 8 (ZA-008): Tour đón thân nhân cho Việt kiều & du học sinh
  // Phân khúc: Người Việt sống tại Úc / Du học sinh / VFR | Độ dài: Trung bình | Số ảnh: 2 ảnh
  // =========================================================================
  'ZA-008': {
    id: 'ZA-008',
    hook: `🇦🇺 Người thân từ Việt Nam sang thăm nhưng bạn bận đi làm không thể đưa đi chơi cả tuần? Đừng lo, TourLuk đã có giải pháp tour linh hoạt đón tận nơi!`,
    lead: `✨ Giải pháp trọn vẹn dành cho kiều bào, du học sinh và người Việt đang định cư tại Úc khi đón bố mẹ, người thân sang thăm.`,
    sections: [
      {
        heading: `😅 NỖI NIỀM KHI ĐÓN BA MẸ SANG ÚC THĂM THÂN:`,
        text: `Ba mẹ từ quê nhà vượt vạn dặm sang Úc thăm con cháu. Nhưng ngày thường bạn bận đi làm, con cái bận đi học, để bố mẹ quanh quẩn trong nhà thì bí bách, mà để bố mẹ tự đi tàu điện thì lo lắng rào cản tiếng Anh và lạc đường.\n👉 TourLuk chính là "người bạn đồng hành tin cậy" san sẻ nỗi lo cùng bạn!`,
        imageIndex: 0,
        imageCaption: `Du khách Việt Nam rạng rỡ lưu lại kỷ niệm đẹp khi được chăm sóc chu đáo trong từng chặng đường.`,
      },
      {
        heading: `🌟 CÁC GÓI TOUR LINH HOẠT KHỞI HÀNH TẠI ÚC:`,
        text: `• Tour trong ngày (Day Tour): Đón tại điểm hẹn trung tâm Sydney, Melbourne hoặc Brisbane. Sáng đi ngắm cảnh, chiều tối trả khách về an toàn.\n• Tour cuối tuần (Weekend Tour 2N1Đ - 3N2Đ): Đưa ba mẹ đi thăm các kỳ quan thiên nhiên nổi tiếng (Blue Mountains, Great Ocean Road, Phillip Island ngắm chim cánh cụt).\n• Hướng dẫn viên người Việt chăm sóc tận tình: Chụp ảnh gửi về cho gia đình, nhắc nhở uống nước, giữ ấm – bạn hoàn toàn yên tâm làm việc!`,
        imageIndex: 1,
        imageCaption: `Điểm ngắm cảnh thiên nhiên trong lành với đội ngũ hướng dẫn viên người Việt đồng hành chu đáo.`,
      },
      {
        heading: `📲 ĐẶT TOUR DỄ DÀNG NGAY TẠI ÚC HOẶC VIỆT NAM:`,
        text: `Thanh toán linh hoạt qua chuyển khoản ngân hàng Úc (PayID/BSB) hoặc tài khoản ngân hàng Việt Nam. Mọi lịch trình đều được xác nhận nhanh chóng qua Zalo.`,
      },
    ],
    cta: `XEM DANH SÁCH DAY TOUR KHỞI HÀNH TẠI SYDNEY & MELBOURNE`,
    hashtags: ['TourLuk', 'TourThamThanUc', 'VietKieuUc', 'DuHocSinhUc', 'DayTourUc'],
  },

  // =========================================================================
  // BÀI 9 (ZA-009): Ẩm thực & Mua sắm tại Úc
  // Phân khúc: Khách thích ẩm thực & mua sắm | Độ dài: Trung bình | Số ảnh: 2 ảnh
  // =========================================================================
  'ZA-009': {
    id: 'ZA-009',
    hook: `🦞 Đi Úc ăn gì đặc sản, mua quà gì chuẩn xịn không bị hớ và nên ghé những khu chợ nào náo nhiệt nhất? Cẩm nang ẩm thực & mua sắm không thể bỏ lỡ!`,
    lead: `✨ Dành riêng cho các tín đồ mê ẩm thực tươi ngon và yêu thích chọn quà chuẩn chất lượng xứ sở chuột túi.`,
    sections: [
      {
        heading: `🍽️ 3 TRẢI NGHIỆM ẨM THỰC NHẤT ĐỊNH PHẢI THỬ:`,
        text: `1. Chợ cá Sydney Fish Market: Thưởng thức tôm hùm Úc sốt bơ tỏi, hàu tươi vắt chanh béo ngậy và sashimi tươi rói ngay tại bờ vịnh.\n2. Bò Úc hảo hạng (Aussie Beef Steak): Thịt bò ăn cỏ mềm mọng, nướng tái vừa thơm lừng ăn kèm vang đỏ thung lũng Barossa.\n3. Văn hóa cà phê Flat White: Khởi đầu ngày mới với một tách Flat White bọt sữa mịn màng tại một quán cà phê ngõ nhỏ Melbourne.`,
        imageIndex: 0,
        imageCaption: `Không gian ẩm thực ven sông sôi động với những món ăn tươi ngon đặc sắc nước Úc.`,
      },
      {
        heading: `🛍️ MUA GÌ VỀ LÀM QUÀ CHUẨN XỊN – KHÔNG LO GIÁ ẢO?`,
        text: `• Mật ong Manuka & keo ong Propolis: Kháng khuẩn tự nhiên, tăng đề kháng cho bố mẹ.\n• Kem dưỡng da nhau thai cừu & dầu đà điểu Emu Oil: Dưỡng ẩm mềm mịn da, món quà mẹ và các chị rất thích.\n• Hạt mắc ca (Macadamia) & hạt óc chó Úc: Giòn bùi, đóng gói hút chân không tiện mang lên máy bay.\n• Rượu vang đỏ thung lũng Barossa / Hunter Valley: Món quà biếu sang trọng dành cho đối tác và người thân.`,
        imageIndex: 1,
        imageCaption: `Khu chợ trời cuối tuần truyền thống tấp nập du khách chọn quà lưu niệm và đặc sản địa phương.`,
      },
      {
        heading: `📍 CÁC KHU CHỢ NỔI TIẾNG NÊN GHÉ:`,
        text: `Chợ Nông sản Queen Victoria Market (Melbourne), Chợ cổ The Rocks Markets (Sydney), Chợ South Melbourne Market với món hàu chỉ $2 AUD/con.`,
      },
    ],
    cta: `LƯU LẠI CẨM NANG VÀ NHẬN BẢN ĐỒ ĂN UỐNG MUA SẮM TẠI ÚC`,
    hashtags: ['TourLuk', 'AmThucUc', 'MuaSamDiUc', 'SydneyFishMarket', 'ChoNuocUc'],
  },

  // =========================================================================
  // BÀI 10 (ZA-010): Chọn lịch trình 3, 5, 7, 10 hay 14 ngày
  // Phân khúc: Khách đang lập kế hoạch | Độ dài: Dài | Số ảnh: 3 ảnh
  // =========================================================================
  'ZA-010': {
    id: 'ZA-010',
    hook: `🗓️ Bạn có 5 ngày, 7 ngày hay 10 ngày cho chuyến đi Úc sắp tới? Đừng để thời gian trôi qua lãng phí với gợi ý phân bổ lịch trình tối ưu dưới đây.`,
    lead: `✨ Hướng dẫn chi tiết giúp bạn chọn số ngày và tuyến điểm phù hợp nhất với thời gian nghỉ phép và ngân sách của gia đình.`,
    sections: [
      {
        heading: `⚡ 1. LỊCH TRÌNH 3 - 5 NGÀY: TẬP TRUNG 1 THÀNH PHỐ`,
        text: `• Phù hợp: Khách kết hợp công tác, thăm thân hoặc kỳ nghỉ ngắn ngày.\n• Tuyến điểm đề xuất: Chọn DUY NHẤT Sydney hoặc Melbourne.\n• Lợi thế: Không tốn thời gian di chuyển sân bay giữa các bang. Thư thái dạo chơi trung tâm và trải nghiệm 1 tour ngày ra ngoại ô (Blue Mountains hoặc Yarra Valley).`,
        imageIndex: 0,
        imageCaption: `Khung cảnh vịnh biển Sydney lý tưởng cho những chuyến đi ngắn ngày tập trung trải nghiệm.`,
      },
      {
        heading: `🌟 2. LỊCH TRÌNH 7 - 8 NGÀY: "LỰA CHỌN VÀNG" SYDNEY - MELBOURNE`,
        text: `• Phù hợp: 80% du khách Việt Nam đi tour Úc lần đầu.\n• Tuyến điểm đề xuất: 4 ngày tại Sydney (Nhà hát Con Sò, vịnh biển Bondi, phố cổ) + 4 ngày tại Melbourne (Thành phố nghệ thuật, Great Ocean Road, đảo Phillip).\n• Lợi thế: Trải nghiệm trọn vẹn cả 2 phong cách sống đối lập, cân đối tuyệt vời giữa chi phí và thời gian nghỉ phép.`,
        imageIndex: 1,
        imageCaption: `Sắc xanh yên bình của cung đường Great Ocean Road tại bang Victoria trong hành trình 7-8 ngày.`,
      },
      {
        heading: `🚀 3. LỊCH TRÌNH 10 - 14 NGÀY: ĐẠI HÀNH TRÌNH KHÁM PHÁ NƯỚC ÚC`,
        text: `• Phù hợp: Gia đình có kỳ nghỉ dài, muốn đi một lần cho thỏa mơ ước.\n• Tuyến điểm đề xuất: Sydney – Melbourne – Brisbane/Gold Coast hoặc mở rộng đến rạn san hô Great Barrier Reef (Cairns) / Perth.\n• Lợi thế: Thưởng lãm từ công trình biểu tượng, vịnh biển nhiệt đới đến kỳ quan thiên nhiên thế giới nguyên sơ.`,
        imageIndex: 2,
        imageCaption: `Bãi biển Surfers Paradise đầy nắng tại Queensland – điểm dừng chân không thể thiếu cho hành trình 10-14 ngày.`,
      },
      {
        heading: `🎯 LỜI KHUYÊN TỪ CHUYÊN GIA TOURLUK:`,
        text: `Nước Úc rộng gấp 23 lần Việt Nam. Đừng cố ép 4-5 thành phố vào chuyến đi dưới 8 ngày vì bạn sẽ dành phần lớn thời gian ở phòng chờ sân bay! Hãy để TourLuk giúp bạn tối ưu hóa thời gian di chuyển.`,
      },
    ],
    cta: `NHẬN TƯ VẤN THIẾT KẾ LỊCH TRÌNH RIÊNG THEO SỐ NGÀY NGHỈ CỦA BẠN`,
    hashtags: ['TourLuk', 'LichTrinhDiUc', 'TourUc7Ngay', 'TourUc10Ngay', 'KhamPhaUc'],
  },

  // =========================================================================
  // BÀI 11 (ZA-011): So sánh các lựa chọn tour theo ngân sách
  // Phân khúc: Khách đang so sánh & có ý định đặt | Độ dài: Dài | Số ảnh: 2 ảnh
  // =========================================================================
  'ZA-011': {
    id: 'ZA-011',
    hook: `💰 Đi tour Úc cần chuẩn bị ngân sách bao nhiêu? Phân tích chi tiết giá trọn gói, các khoản bao gồm và kinh nghiệm tránh chi phí ẩn khi đặt tour.`,
    lead: `✨ Bóc tách minh bạch cấu trúc giá tour Úc giúp bạn dễ dàng so sánh, đánh giá đúng chất lượng dịch vụ và chọn gói tour thông thái nhất.`,
    sections: [
      {
        heading: `📊 1. CÁC PHÂN KHÚC GIÁ TOUR ÚC TRÊN THỊ TRƯỜNG`,
        text: `• Phân khúc Tour Giá Rẻ (dưới 45 triệu): Thường dùng khách sạn 3 sao ở xa trung tâm (mất 45-60 phút đi xe mỗi ngày), cắt giảm bữa ăn hoặc có các điểm mua sắm chỉ định.\n• Phân khúc Tiêu Chuẩn 4 Sao TourLuk (50 - 65 triệu): Bay hãng hàng không chất lượng (Vietnam Airlines / Bamboo), khách sạn 4 sao trung tâm, thực đơn bữa ăn phong phú (tôm hùm, bò Úc), trọn gói vé tham quan và bảo hiểm quốc tế mức cao.\n• Phân khúc Tour May Đo Riêng (Private Tour): Xe riêng, HDV riêng, lịch trình linh hoạt theo giờ giấc gia đình.`,
        imageIndex: 0,
        imageCaption: `Khách sạn 4 sao tiêu chuẩn trung tâm giúp du khách nghỉ ngơi tiện nghi và thoải mái dạo phố về đêm.`,
      },
      {
        heading: `🔍 2. 5 KHOẢN CẦN KIỂM TRA KỸ TRONG HỢP ĐỒNG TOUR:`,
        text: `1. Phí Visa Úc: Đã bao gồm phí lãnh sự và phí lấy dấu vân tay VFS chưa?\n2. Tiền Tip hướng dẫn viên & lái xe: Đã gồm trong giá hay bắt buộc đóng thêm?\n3. Vé tham quan điểm nhấn: Vé du thuyền vịnh Sydney, vé cáp treo Blue Mountains đã bao gồm chưa?\n4. Vị trí khách sạn: Nằm ở trung tâm thành phố hay ngoại ô xa xôi?\n5. Chính sách hoàn hủy minh bạch: Trường hợp không đạt visa thì hoàn lại bao nhiêu tiền?`,
        imageIndex: 1,
        imageCaption: `Trải nghiệm du thuyền trên vịnh Sydney được bao gồm trọn gói trong dịch vụ tiêu chuẩn của TourLuk.`,
      },
      {
        heading: `✅ CHÍNH SÁCH BẢO VỆ KHÁCH HÀNG TẠI TOURLUK:`,
        text: `TourLuk cam kết 100% hợp đồng rõ ràng, không phụ thu bất ngờ, hỗ trợ bảo lưu hoặc hoàn phí theo quy định nếu phát sinh sự cố visa.`,
      },
    ],
    cta: `NHẬN BÁNG BÁO GIÁ CHI TIẾT VÀ CHƯƠNG TRÌNH KHUYẾN MÃI MỚI NHẤT`,
    hashtags: ['TourLuk', 'GiaTourUc', 'TourUcTronGoi', 'ChiPhiDiUc', 'SoSanhTour'],
  },

  // =========================================================================
  // BÀI 12 (ZA-012): 12 bài học thực tế từ khách hàng TourLuk
  // Phân khúc: Khách ấm / Người theo dõi | Độ dài: Rất dài | Số ảnh: 3 ảnh
  // =========================================================================
  'ZA-012': {
    id: 'ZA-012',
    hook: `💡 12 kinh nghiệm xương máu được đúc kết từ hàng trăm chuyến đi thực tế của khách hàng TourLuk: Đọc kỹ trước khi đặt chân đến nước Úc!`,
    lead: `✨ Thay vì những lời quảng cáo hoa mỹ, TourLuk xin gửi đến bạn 12 bài học thực tế nhất được chia sẻ từ chính những vị khách vừa trở về sau hành trình khám phá nước Úc:`,
    sections: [
      {
        heading: `📌 1. ĐỪNG CỐ "NHỒI NHÉT" QUÁ NHIỀU THÀNH PHỐ`,
        text: `Nước Úc rộng bằng cả châu Âu! Di chuyển giữa các bang mất ít nhất nửa ngày làm thủ tục sân bay. Với chuyến đi dưới 8 ngày, chỉ nên chọn tối đa 2 bang (Sydney - Melbourne) để có thời gian thong thả ngắm cảnh mà không bị kiệt sức.`,
      },
      {
        heading: `📌 2. THỜI TIẾT MELBOURNE NỔI TIẾNG "4 MÙA TRONG 1 NGÀY"`,
        text: `Buổi sáng se lạnh 15°C, trưa nắng ấm 26°C và chiều tối lộng gió biển. Bài học đắt giá là luôn mặc theo phong cách "layering" (áo phông + cardigan mỏng + áo khoác gió nhẹ) để dễ dàng thích nghi khi di chuyển.`,
        imageIndex: 0,
        imageCaption: `Thời tiết Melbourne thay đổi linh hoạt trong ngày đòi hỏi trang phục layering thông minh và thoải mái.`,
      },
      {
        heading: `📌 3. ÚC LÀ QUỐC GIA GẦN NHƯ 100% THANH TOÁN KHÔNG DÙNG TIỀN MẶT`,
        text: `Khách chỉ cần chuẩn bị 1 thẻ Visa hoặc Mastercard (có tính năng chạm PayWave) là có thể mua từ vé tàu, cốc cà phê Flat White đến bữa tối sang trọng. Bạn chỉ nên đổi khoảng $100 - $200 AUD tiền mặt để phòng hờ.`,
      },
      {
        heading: `📌 4. HÀNH LÝ & QUY ĐỊNH HẢI QUAN ÚC SIÊU NGHIÊM NGẶT`,
        text: `Tuyệt đối KHÔNG mang thịt tươi, thịt khô, trứng, tổ yến, trái cây tươi hoặc các loại hạt vào Úc. Nhờ HDV TourLuk kiểm tra và hướng dẫn khai báo hải quan từ sân bay Việt Nam, khách đi qua cửa khẩu Úc cực kỳ nhẹ nhàng, chỉ mất 15 phút.`,
      },
      {
        heading: `📌 5. CHỌN KHUNG GIỜ VÀNG CHỤP ẢNH TẠI CÁC KỲ QUAN`,
        text: `Để có những bức ảnh triệu like không bị dính người, HDV TourLuk luôn bố trí đưa khách đến điểm ngắm Circular Quay lúc 8:30 sáng và cụm đá Mười Hai Tông Đồ (12 Apostles) vào khoảnh khắc hoàng hôn chiều tà đẹp như tranh vẽ.`,
        imageIndex: 1,
        imageCaption: `Hoàng hôn buông xuống trên cụm đá 12 Vị Tông Đồ tạo nên khung cảnh tráng lệ bậc nhất tại bang Victoria.`,
      },
      {
        heading: `📌 6. ĐI BỘ VỪA SỨC – ƯU TIÊN XE ĐÓN TRUNG TÂM`,
        text: `Nhiều khách đi tự túc than phiền phải đi bộ 15.000 - 20.000 bước mỗi ngày khiến bố mẹ bị sưng chân. Đi tour TourLuk có xe riêng đón tận cửa khách sạn trung tâm, đi bộ ngắm cảnh chỉ 15-20 phút nhẹ nhàng.`,
      },
      {
        heading: `📌 7. NƯỚC UỐNG CÔNG CỘNG SIÊU SẠCH TẠI ÚC`,
        text: `Nước máy tại Úc đạt chuẩn uống trực tiếp tại vòi. Bạn chỉ cần mang theo 1 bình giữ nhiệt cá nhân để lấy nước tại các trụ công cộng, vừa tiết kiệm vừa bảo vệ môi trường.`,
      },
      {
        heading: `📌 8. LỆCH MÚI GIỜ CHỈ 3 - 4 TIẾNG: DỄ THÍCH NGHI`,
        text: `Không như đi châu Âu hay Mỹ lệch 12 tiếng gây mệt mỏi, múi giờ bờ Đông Úc chỉ đi trước Việt Nam 3 tiếng (mùa đông) hoặc 4 tiếng (mùa hè). Khách chỉ cần ngủ một giấc trên máy bay là hôm sau tỉnh táo vui chơi ngay.`,
      },
      {
        heading: `📌 9. CHỌN SIM 4G SÓNG KHỎE CỦA TELSTRA HOẶC OPTUS`,
        text: `Đừng mua sim du lịch không rõ nguồn gốc. Hãy chọn sim của các nhà mạng lớn tại Úc để có sóng căng đét ngay cả khi di chuyển qua các cung đường đèo ven biển Great Ocean Road.`,
      },
      {
        heading: `📌 10. BỮA ĂN XEN KẼ HỢP KHẨU VỊ`,
        text: `Ăn đồ Tây liên tục 3 ngày sẽ khiến người lớn tuổi nhớ cơm nhà. TourLuk luôn bố trí xen kẽ bữa tiệc ẩm thực Úc (hải sản, bít tết) với các bữa cơm thuần Việt ấm cúng có canh nóng, rau xào.`,
        imageIndex: 2,
        imageCaption: `Bữa ăn ấm cúng hợp khẩu vị người Việt giúp duy trì năng lượng dồi dào suốt hành trình khám phá.`,
      },
      {
        heading: `📌 11. MUA QUÀ ĐÚNG NƠI – TRÁNH ĐIỂM BÁN HÀNG ÉP BUỘC`,
        text: `Nên mua thực phẩm chức năng và kem cừu tại các chuỗi nhà thuốc Chemist Warehouse hoặc siêu thị Coles, Woolworths với giá niêm yết chuẩn, thường xuyên có ưu đãi giảm 30-50%.`,
      },
      {
        heading: `📌 12. CHUẨN BỊ THỦ TỤC VISA SỚM TRƯỚC 1 - 2 THÁNG`,
        text: `Thời gian xét duyệt visa du lịch Úc có thể kéo dài từ 2 đến 4 tuần tùy thời điểm. Chuẩn bị hồ sơ sớm giúp bạn săn được vé máy bay đẹp và giữ được giá tour tốt nhất.`,
      },
    ],
    cta: `LƯU LẠI 12 BÀI HỌC VÀ NHẬN TƯ VẤN MAY ĐO CHUYẾN ĐI CỦA BẠN`,
    hashtags: ['TourLuk', 'KinhNghiemDiUc', '12BaiHocDiUc', 'CamNangDuLichUc', 'FeedbackKhachHang'],
  },
};

/**
 * Xây dựng nội dung văn bản hoàn chỉnh có chèn các thẻ hình ảnh inline
 */
export function generateArticleFromBlueprint(
  blueprint: ArticleBlueprint,
  coverImage?: any,
  galleryImages: any[] = [],
): { hook: string; content: string } {
  let content = `${blueprint.hook}\n\n`;
  content += `${blueprint.lead}\n\n`;
  content += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  blueprint.sections.forEach((sec, idx) => {
    if (sec.heading) {
      content += `${sec.heading}\n`;
    }
    content += `${sec.text}\n\n`;

    // Nếu đoạn này có chỉ định ảnh inline
    if (sec.imageIndex !== undefined) {
      const img = galleryImages[sec.imageIndex];
      const caption = sec.imageCaption || (img ? img.name : 'Hình ảnh thực tế chuyến đi');
      // Thẻ ảnh chuẩn được giao diện nhận diện để hiển thị ảnh trực tiếp
      content += `📸 [HÌNH_ẢNH_${sec.imageIndex + 1}: ${caption}]\n\n`;
    }
  });

  content += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  content += `👉 ${blueprint.cta}\n`;
  content += `📲 Nhắn tin trực tiếp qua Zalo OA của TourLuk hoặc bấm nút "Quan tâm" ngay bên dưới để chuyên viên gửi trọn bộ thông tin và tư vấn miễn phí cho chuyến đi của bạn!\n\n`;

  content += blueprint.hashtags.map((t) => `#${t}`).join(' ');

  return {
    hook: blueprint.hook,
    content,
  };
}

