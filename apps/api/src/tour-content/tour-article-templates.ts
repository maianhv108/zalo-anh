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
        text: `Du lịch nước Úc là hành trình mơ ước của nhiều gia đình, nhưng rào cản lớn nhất thường là khoảng cách địa lý rộng lớn, khác biệt văn hóa, thủ tục visa khắt khe và nỗi lo bị phát sinh chi phí. Thấu hiểu điều đó, TourLuk ra đời với cam kết đem đến cho bạn chuyến đi "Dễ hiểu – Vừa sức – Trọn vẹn từng khoảnh khắc".`,
        imageIndex: 0,
        imageCaption: `Bờ vịnh Sydney tuyệt đẹp và không gian thoáng đãng đón chào du khách Việt Nam.`,
      },
      {
        heading: `💎 3 CAM KẾT KHÁC BIỆT TỪ TOURLUK:`,
        text: `Điểm khác biệt lớn nhất tại TourLuk chính là lịch trình được may đo khoa học và vừa sức. Chúng tôi kiên quyết không nhồi nhét điểm đến hay bắt du khách phải vội vã chạy sô. Mỗi ngày trôi qua đều là khoảng thời gian thảnh thơi với hai đến ba điểm nhấn đắt giá, đủ để bạn thưởng thức trọn vẹn tách cà phê bên bờ vịnh và ghi lại những khoảnh khắc đẹp nhất.\n\nĐồng hành cùng bạn là những hướng dẫn viên người Việt bản địa tận tâm, am hiểu sâu sắc văn hóa địa phương và chăm sóc chu đáo từ người lớn tuổi đến các em nhỏ. Đặc biệt, TourLuk cam kết minh bạch 100% mọi chi phí từ vé tham quan, khách sạn đến bữa ăn, đảm bảo bạn hoàn toàn an tâm không lo bất kỳ khoản phụ thu bất ngờ nào.`,
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
    hook: `✈️ Chỉ còn vài ngày nữa là khởi hành sang xứ sở chuột túi nhưng bạn vẫn chưa rõ quy định hải quan Úc, tiền tệ hay di chuyển? Lưu ngay cẩm nang thực tế này!`,
    lead: `✨ Dành riêng cho du khách Việt Nam lần đầu đặt chân đến Úc: Chuẩn bị kỹ càng sẽ giúp chuyến đi của bạn suôn sẻ và thảnh thơi từ phút đầu tiên.`,
    sections: [
      {
        heading: `📋 1. HỒ SƠ GIẤY TỜ & THỦ TỤC NHẬP CẢNH`,
        text: `Trước ngày lên đường, bạn hãy kiểm tra kỹ hộ chiếu còn hạn ít nhất sáu tháng, chuẩn bị sẵn bản in thị thực Visa 600 cùng vé máy bay khứ hồi. Khi ở trên máy bay, tiếp viên sẽ phát cho bạn Tờ khai nhập cảnh (Incoming Passenger Card). Bạn chỉ cần điền trung thực và cẩn thận từng mục, đặc biệt là phần khai báo hành lý mang theo để quá trình qua cổng an ninh diễn ra thuận lợi và nhanh chóng.`,
        imageIndex: 0,
        imageCaption: `Sân bay quốc tế Úc với quy trình hải quan và kiểm dịch sinh học nghiêm ngặt bậc nhất thế giới.`,
      },
      {
        heading: `⚠️ 2. QUY ĐỊNH HẢI QUAN ÚC SIÊU NGHIÊM NGẶT`,
        text: `Hải quan Úc nổi tiếng khắt khe bậc nhất thế giới nhằm bảo vệ an toàn sinh học. Bạn hãy nhớ tuyệt đối không mang theo các loại thịt tươi hoặc thịt sấy khô như chà bông, lạp xưởng, bò khô, cũng như trứng, trái cây tươi và các loại hạt giống chưa qua chế biến. Trong trường hợp bạn có mang theo thuốc men cá nhân hoặc thực phẩm đóng gói có nhãn mác rõ ràng, lời khuyên vàng là hãy luôn tích chọn "YES" trên tờ khai để nhân viên kiểm tra nhanh chóng, tránh rủi ro bị phạt tiền rất nặng.`,
      },
      {
        heading: `💳 3. TIỀN TỆ & KẾT NỐI LIÊN LẠC`,
        text: `Nước Úc hiện nay gần như đã chuyển đổi hoàn toàn sang thanh toán không dùng tiền mặt. Bạn chỉ cần mang theo một chiếc thẻ tín dụng hoặc thẻ ghi nợ quốc tế có tính năng chạm PayWave là có thể thanh toán mọi thứ, từ một ly cà phê sáng cho đến vé tàu xe công cộng. Bạn chỉ nên đổi sẵn khoảng 100 đến 200 đô Úc tiền mặt để phòng hờ. Về kết nối mạng, hãy ưu tiên chọn SIM 4G của các nhà mạng lớn như Telstra hoặc Optus với dung lượng dồi dào, giúp bạn thoải mái gọi video về cho người thân suốt chuyến đi.`,
        imageIndex: 1,
        imageCaption: `Góc phố trung tâm hiện đại tại Úc nơi mọi thanh toán đều thực hiện tiện lợi qua thẻ chạm PayWave.`,
      },
      {
        heading: `👗 4. THỜI TIẾT & CHỌN TRANG PHỤC THÔNG MINH`,
        text: `Do nằm ở Nam bán cầu, các mùa trong năm tại Úc hoàn toàn trái ngược với Việt Nam. Để chuyến đi luôn thoải mái, bạn nên áp dụng phong cách mặc nhiều lớp nhẹ nhàng như áo thun kết hợp cùng áo cardigan mỏng và áo khoác gió. Cách phối đồ này vừa giúp bạn dễ dàng thích ứng với sự chênh lệch nhiệt độ giữa ngày và đêm, vừa lên hình rất thời trang và thanh lịch.`,
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
        heading: `💎 SYDNEY: THIÊN ĐƯỜNG RỰC RỠ BÊN BỜ VỊNH BIỂN VÀ BIỂU TƯỢNG TOÀN CẦU`,
        text: `Nếu bạn là người yêu thích biển xanh ngập tràn ánh nắng và nhịp sống hiện đại, Sydney chắc chắn sẽ làm bạn say lòng ngay từ cái nhìn đầu tiên. Thành phố này luôn khoác lên mình vẻ tươi vui, căng tràn năng lượng với những công trình biểu tượng lừng danh thế giới.\n\nHãy tưởng tượng bạn đang thong thả ngồi trên boong du thuyền lướt nhẹ qua vịnh cảng Circular Quay, đón làn gió biển mát rượi và chiêm ngưỡng Nhà hát Con Sò cùng Cầu Cảng Sydney sừng sững dưới nắng vàng. Buổi chiều, bạn có thể dạo bước trên bãi cát trắng mịn của biển Bondi sôi động, hay lạc vào những con ngõ lát đá cổ kính tại The Rocks để cảm nhận một Sydney vừa hoa lệ vừa đượm màu thời gian. Nơi đây là điểm dừng chân hoàn hảo cho những ai muốn lưu giữ những bức ảnh check-in để đời và tận hưởng một kỳ nghỉ ngập tràn sức sống.`,
        imageIndex: 0,
        imageCaption: `Sydney rực rỡ bên bờ vịnh với những biểu tượng kiến trúc lừng danh thế giới.`,
      },
      {
        heading: `🍁 MELBOURNE: GIAI ĐIỆU CỔ ĐIỂN CỦA NGHỆ THUẬT, CÀ PHÊ VÀ SỰ BÌNH YÊN`,
        text: `Trái ngược với sự náo nhiệt của Sydney, Melbourne lại mang vẻ đẹp trầm mặc, quyến rũ như một quý cô châu Âu cổ điển. Không gian nơi đây lắng đọng với những công trình kiến trúc thời Victoria, những vườn hoa Fitzroy rợp bóng mát và hương cà phê Flat White thơm nồng lan tỏa từ từng góc phố nhỏ.\n\nĐặt chân đến Melbourne, bạn sẽ thích thú khi thong thả tản bộ qua những con ngõ Hosier Lane ngập tràn các bức bích họa graffiti đầy tính nghệ thuật, nhấp ngụm cà phê chuẩn vị và lắng nghe nhịp sống bình dị trôi qua. Đặc biệt, từ Melbourne, hành trình chinh phục cung đường biển Great Ocean Road và cụm đá Mười Hai Tông Đồ kỳ vĩ sẽ mang lại cho bạn những xúc cảm choáng ngợp trước thiên nhiên hoang sơ. Melbourne sinh ra là để dành cho các cặp đôi, người yêu nghệ thuật và những ai đang tìm kiếm một khoảng trời yên ả, sâu lắng để nuôi dưỡng tâm hồn.`,
        imageIndex: 1,
        imageCaption: `Con ngõ Hosier Lane ngập tràn các tác phẩm graffiti sáng tạo đặc trưng của Melbourne.`,
      },
      {
        heading: `🚗 KINH NGHIỆM ĐI CUNG ĐƯỜNG BIỂN GREAT OCEAN ROAD:`,
        text: `Cung đường biển Great Ocean Road và cụm đá Mười Hai Tông Đồ đẹp mê hồn nhưng quãng đường khứ hồi từ Melbourne kéo dài từ năm đến sáu tiếng. Thấu hiểu điều đó, hành trình của TourLuk luôn được bố trí ngắt chặng khoa học tại các thị trấn ven biển thanh bình như Lorne và Apollo Bay. Nhờ vậy, bạn vừa có thể thong thả thưởng lãm cảnh sắc ngoạn mục, vừa có thời gian dừng chân nghỉ ngơi, uống nước và duỗi chân thoải mái suốt dọc đường.`,
        imageIndex: 2,
        imageCaption: `Kỳ quan thiên nhiên 12 Vị Tông Đồ (12 Apostles) sừng sững bên bờ sóng bạc đầu tại Victoria.`,
      },
      {
        heading: `👉 LỰA CHỌN TỐI ƯU NHẤT CHO KỲ NGHỈ CỦA BẠN:`,
        text: `Nếu bạn có khoảng thời gian từ bảy đến tám ngày, giải pháp trọn vẹn nhất là chọn hành trình liên tuyến Sydney - Melbourne của TourLuk. Chuyến đi sẽ giúp bạn thưởng thức trọn vẹn cả hai sắc thái đối lập mà vô cùng cuốn hút của nước Úc, từ nét hiện đại rực rỡ bên vịnh biển đến chiều sâu văn hóa cổ điển đầy chất thơ.`,
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
        text: `Brisbane chào đón du khách bằng nhịp sống thư thái và khí hậu ấm áp quanh năm. Trải nghiệm tuyệt vời nhất tại đây là bước lên chiếc phà CityCat lướt êm ả trên dòng sông uốn lượn, ngắm nhìn toàn cảnh thành phố hiện đại đôi bờ. Ngay sát trung tâm, khu phức hợp South Bank mở ra một bãi biển nhân tạo trong lành giữa lòng đô thị, nơi bạn cùng người thân có thể thảnh thơi dạo mát trên bờ cát trắng và để các bé thỏa thích nô đùa dưới làn nước mát an toàn.`,
        imageIndex: 0,
        imageCaption: `Khu phức hợp công viên và bãi biển nhân tạo South Bank nổi tiếng tại trung tâm Brisbane.`,
      },
      {
        heading: `🎢 GOLD COAST: THIÊN ĐƯỜNG CỦA BIỂN VÀ CÔNG VIÊN GIẢI TRÍ`,
        text: `Chỉ mất một giờ lái xe từ Brisbane, Gold Coast hiện ra như một thiên đường nghỉ dưỡng đích thực với dải cát vàng óng ả dài bất tận tại bãi biển Surfers Paradise. Nơi đây là điểm hẹn trong mơ của các gia đình có con nhỏ nhờ chuỗi công viên chủ đề đẳng cấp thế giới như Warner Bros. Movie World và Sea World. Các bé sẽ vô cùng hào hứng khi được tận mắt gặp gỡ những siêu nhân thần tượng, xem các màn xiếc cá heo kỳ thú và hòa mình vào vô vàn trò chơi sôi động.`,
        imageIndex: 1,
        imageCaption: `Bãi biển Surfers Paradise dài ngút ngàn với những đợt sóng bạc đầu và nắng vàng quanh năm.`,
      },
      {
        heading: `💡 LỊCH TRÌNH GỢI Ý ĐỂ TẬN HƯỞNG TRỌN VẸN:`,
        text: `Hành trình lý tưởng nhất là bốn ngày ba đêm hoặc năm ngày bốn đêm. Bạn nên chọn khách sạn lưu trú tại Gold Coast để tiện cho việc tắm biển và vui chơi tại các công viên giải trí, sau đó dành trọn vẹn một ngày dạo quanh khám phá vẻ đẹp yên bình của Brisbane trước khi lên máy bay trở về.`,
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
        text: `Hai ngày đầu tiên tại miền Tây Úc sẽ đưa bạn đến với công viên Kings Park rộng lớn, nơi bạn có thể phóng tầm mắt ôm trọn đường chân trời tuyệt đẹp của thành phố Perth và dòng sông Swan êm đềm. Chuyến hải trình tiếp tục bằng phà cao tốc đưa bạn sang hòn đảo Rottnest hoang sơ. Tại đây, bạn có thể thong dong đạp xe quanh các vịnh biển vắng người, hòa mình vào làn nước xanh màu ngọc bích và chụp những bức ảnh selfie đáng nhớ cùng loài chuột túi Quokka – loài động vật thân thiện được mệnh danh là hạnh phúc nhất hành tinh.`,
        imageIndex: 0,
        imageCaption: `Góc nhìn ngoạn mục từ đài quan sát công viên Kings Park ôm trọn trung tâm thành phố Perth.`,
      },
      {
        heading: `⛵ NGÀY 3 & 4: CẢNG CỔ FREMANTLE & SA MẠC ĐÁ PINNACLES`,
        text: `Những ngày tiếp theo là dịp để bạn chậm rãi khám phá thị trấn cảng cổ kính Fremantle với những dãy phố rực rỡ phong vị phương Tây, thưởng thức món cá chiên Fish & Chips giòn rụm bên bến thuyền buồm lộng gió. Hành trình sẽ khép lại đầy ấn tượng tại sa mạc cát vàng Pinnacles thuộc Công viên Quốc gia Nambung, nơi hàng nghìn cột đá vôi nhô lên sừng sững giữa không gian bao la, tạo nên một khung cảnh kỳ vĩ như đang lạc bước trên bề mặt sao Hỏa.`,
        imageIndex: 1,
        imageCaption: `Khung cảnh bình yên của bến du thuyền Fremantle và vùng biển xanh thẳm miền Tây Úc.`,
      },
      {
        heading: `📌 ĐIỂM CỘNG LỚN KHI CHỌN KHÁM PHÁ PERTH:`,
        text: `Perth có múi giờ hoàn toàn trùng khớp hoặc chỉ lệch một tiếng so với Việt Nam, đi kèm thời tiết khô ráo và khí hậu trong lành quanh năm. Du khách sẽ không gặp phải cảm giác mệt mỏi vì lệch múi giờ, rất thích hợp cho những ai muốn một chuyến đi nghỉ dưỡng thực sự để tái tạo năng lượng.`,
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
        text: `Người lớn tuổi thường nhanh mỏi khớp gối, trong khi trẻ nhỏ lại dễ cáu gắt khi phải đi bộ liên tục. Hiểu được điều đó, TourLuk áp dụng nguyên tắc mỗi buổi chỉ tập trung vào một trải nghiệm chính. Giữa các điểm tham quan luôn có những khoảng nghỉ thảnh thơi từ ba mươi đến bốn mươi lăm phút tại các quán cà phê rợp bóng mát hoặc ghế nghỉ ven công viên biển, giúp mọi thành viên luôn dồi dào năng lượng.`,
        imageIndex: 0,
        imageCaption: `Không gian công viên rợp bóng cây xanh mát giúp các thế hệ trong gia đình thảnh thơi dạo bước.`,
      },
      {
        heading: `🚌 2. XE ĐƯA ĐÓN RIÊNG TẬN SẢNH – TẠM BIỆT NỖI LO TÀU XE ĐÔNG ĐÚC`,
        text: `Dù hệ thống giao thông công cộng tại Úc rất phát triển, việc di chuyển qua các ga ngầm dài và cầu thang cuốn dốc thường là thử thách lớn với người lớn tuổi. Khi đồng hành cùng TourLuk, xe du lịch đời mới sẽ đưa đón gia đình bạn tận cửa khách sạn. Khoang xe rộng rãi, máy lạnh êm dịu giúp ông bà và các bé luôn cảm thấy thư thái, an toàn suốt mọi chặng đường.`,
        imageIndex: 1,
        imageCaption: `Phương tiện xe đưa đón riêng chất lượng cao tạo sự tiện lợi tối đa cho gia đình có trẻ em và người già.`,
      },
      {
        heading: `🍲 3. BỮA ĂN HỢP KHẨU VỊ VÀ ẤM CÚNG`,
        text: `Thực đơn trong suốt chuyến đi được cân đối hài hòa và chu đáo. Những bữa cơm thuần Việt với canh nóng, rau xanh thơm ngon hợp khẩu vị của ông bà sẽ được đan xen khéo léo cùng các bữa tiệc hải sản tươi sống và bít tết bò Úc trứ danh, đảm bảo cả nhà đều có những trải nghiệm ẩm thực trọn vẹn và ngon miệng.`,
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
        text: `Ba mẹ vượt vạn dặm sang Úc thăm con cháu là niềm vui khôn tả. Thế nhưng vào ngày thường, bạn bận rộn với công việc còn các cháu mải mê việc học. Để ba mẹ quanh quẩn trong nhà thì bí bách, mà để người lớn tự đi tàu điện thì lại lo lắng rào cản ngôn ngữ và lạc đường. TourLuk chính là giải pháp đồng hành đáng tin cậy giúp bạn san sẻ trọn vẹn nỗi niềm ấy.`,
        imageIndex: 0,
        imageCaption: `Du khách Việt Nam rạng rỡ lưu lại kỷ niệm đẹp khi được chăm sóc chu đáo trong từng chặng đường.`,
      },
      {
        heading: `🌟 CÁC GÓI TOUR LINH HOẠT KHỞI HÀNH TẠI ÚC:`,
        text: `TourLuk mang đến các gói tour trong ngày vô cùng tiện lợi, đón trả tận nơi tại trung tâm Sydney, Melbourne hay Brisbane. Buổi sáng ba mẹ được đưa đi thưởng ngoạn danh lam thắng cảnh, chiều tối xe đưa về tận nhà an toàn và ấm áp.\n\nVào dịp cuối tuần, các hành trình ngắn ngày sẽ đưa gia đình đến những kỳ quan nổi tiếng như dãy Blue Mountains kỳ vĩ, cung đường Great Ocean Road hay đảo Phillip ngắm chim cánh cụt về tổ. Đội ngũ hướng dẫn viên người Việt luôn tận tâm chăm sóc từng bữa ăn, nhắc ba mẹ uống nước giữ ấm và chụp ảnh cập nhật liên tục, giúp bạn hoàn toàn an tâm làm việc.`,
        imageIndex: 1,
        imageCaption: `Điểm ngắm cảnh thiên nhiên trong lành với đội ngũ hướng dẫn viên người Việt đồng hành chu đáo.`,
      },
      {
        heading: `📲 ĐẶT TOUR DỄ DÀNG NGAY TẠI ÚC HOẶC VIỆT NAM:`,
        text: `Bạn có thể thanh toán linh hoạt bằng tài khoản ngân hàng Úc qua PayID hoặc chuyển khoản ngân hàng Việt Nam. Mọi thông tin lịch trình và xác nhận đặt chỗ đều được đội ngũ tư vấn hỗ trợ nhanh chóng qua Zalo.`,
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
        text: `Đến Úc, bạn nhất định không thể bỏ qua bữa tiệc hải sản tươi rói tại Chợ cá Sydney Fish Market danh tiếng, nơi những con tôm hùm Úc đẫm sốt bơ tỏi và hàu tươi vắt chanh béo ngậy được phục vụ ngay bên bờ vịnh mát lành. Vào bữa tối, món bò Úc thượng hạng nướng tái vừa mềm mọng, tỏa hương thơm quyến rũ khi thưởng thức cùng một ly vang đỏ vùng Barossa sẽ đánh thức mọi giác quan của bạn. Và để khởi đầu ngày mới tràn đầy cảm hứng, hãy ghé một quán cà phê ngõ nhỏ tại Melbourne để thưởng thức một tách Flat White với lớp bọt sữa sánh mịn đặc trưng.`,
        imageIndex: 0,
        imageCaption: `Không gian ẩm thực ven sông sôi động với những món ăn tươi ngon đặc sắc nước Úc.`,
      },
      {
        heading: `🛍️ MUA GÌ VỀ LÀM QUÀ CHUẨN XỊN – KHÔNG LO GIÁ ẢO?`,
        text: `Khi tìm quà tặng cho người thân, mật ong Manuka và keo ong tự nhiên luôn là ưu tiên hàng đầu nhờ công dụng tăng cường sức đề kháng cho ông bà, cha mẹ. Với các mẹ và chị em, những hũ kem dưỡng nhau thai cừu hay dầu đà điểu Emu Oil giàu dưỡng chất sẽ là món quà chăm sóc da vô cùng ý nghĩa. Ngoài ra, các loại hạt mắc ca và óc chó sấy giòn bùi đóng gói hút chân không, cùng những chai rượu vang hảo hạng từ thung lũng Barossa hay Hunter Valley, sẽ là món quà biếu trang trọng và thiết thực sau chuyến đi.`,
        imageIndex: 1,
        imageCaption: `Khu chợ trời cuối tuần truyền thống tấp nập du khách chọn quà lưu niệm và đặc sản địa phương.`,
      },
      {
        heading: `📍 CÁC KHU CHỢ NỔI TIẾNG NÊN GHÉ:`,
        text: `Bạn có thể dành thời gian dạo bước tại Chợ Nông sản Queen Victoria Market lâu đời ở Melbourne, ghé thăm Chợ phiên cuối tuần The Rocks tại Sydney, hoặc trải nghiệm thưởng thức hàu tươi sống với giá chỉ hai đô Úc một con tại Chợ South Melbourne nhộn nhịp.`,
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
        heading: `⚡ 1. LỊCH TRÌNH 3 - 5 NGÀY: TẬP TRUNG KHÁM PHÁ MỘT ĐÔ THỊ ĐỈNH CAO`,
        text: `Nếu bạn kết hợp chuyến đi cùng công tác, thăm thân hoặc chỉ có kỳ nghỉ ngắn ngày, lựa chọn thông minh nhất là tập trung trọn vẹn vào Sydney hoặc Melbourne. Việc không phải di chuyển máy bay giữa các bang sẽ giúp bạn tiết kiệm nhiều thời gian quý báu. Bạn có thể thư thả dạo chơi các danh thắng nổi tiếng ở trung tâm và dành thêm một ngày trải nghiệm các tour dã ngoại tuyệt đẹp như thung lũng rượu vang Yarra Valley hay dãy núi Blue Mountains.`,
        imageIndex: 0,
        imageCaption: `Khung cảnh vịnh biển Sydney lý tưởng cho những chuyến đi ngắn ngày tập trung trải nghiệm.`,
      },
      {
        heading: `🌟 2. LỊCH TRÌNH 7 - 8 NGÀY: "LỰA CHỌN VÀNG" LIÊN TUYẾN SYDNEY - MELBOURNE`,
        text: `Đây là hành trình được hơn 80% du khách Việt Nam lựa chọn cho chuyến đi Úc đầu tiên. Khoảng thời gian này vừa vặn để bạn dành bốn ngày khám phá vẻ đẹp hiện đại của Sydney bên bờ vịnh, và bốn ngày còn lại đắm mình trong nét văn hóa cổ điển, ngắm chim cánh cụt tại đảo Phillip và chinh phục cung đường biển Great Ocean Road ở Melbourne. Chuyến đi mang lại sự cân bằng hoàn hảo giữa chi phí, thời gian nghỉ phép và chiều sâu trải nghiệm.`,
        imageIndex: 1,
        imageCaption: `Sắc xanh yên bình của cung đường Great Ocean Road tại bang Victoria trong hành trình 7-8 ngày.`,
      },
      {
        heading: `🚀 3. LỊCH TRÌNH 10 - 14 NGÀY: ĐẠI HÀNH TRÌNH XUYÊN NƯỚC ÚC`,
        text: `Dành cho những gia đình có kỳ nghỉ dài và mong muốn khám phá trọn vẹn xứ sở chuột túi một lần cho thỏa mơ ước. Bạn có thể mở rộng tuyến Sydney – Melbourne tới vùng biển nắng ấm rực rỡ Brisbane và Gold Coast, hoặc ghé thăm rạn san hô Great Barrier Reef kỳ vĩ tại Cairns. Đây sẽ là một hành trình đa sắc màu, kết hợp hoàn hảo từ những công trình biểu tượng hiện đại đến những kỳ quan thiên nhiên ngoạn mục hàng đầu thế giới.`,
        imageIndex: 2,
        imageCaption: `Bãi biển Surfers Paradise đầy nắng tại Queensland – điểm dừng chân không thể thiếu cho hành trình 10-14 ngày.`,
      },
      {
        heading: `🎯 LỜI KHUYÊN TỪ CHUYÊN GIA TOURLUK:`,
        text: `Nước Úc có diện tích rộng lớn gấp nhiều lần Việt Nam. Bạn không nên cố gắng ép quá bốn đến năm thành phố vào một chuyến đi dưới tám ngày, vì điều đó sẽ khiến bạn phải tốn phần lớn thời gian chờ đợi ở sân bay. Hãy để TourLuk giúp bạn tối ưu hóa thời gian di chuyển để kỳ nghỉ thực sự là khoảng thời gian thư thái và đáng nhớ.`,
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
        text: `Hiện nay trên thị trường có nhiều mức giá tour khác nhau. Các gói tour giá rẻ thường sử dụng khách sạn ba sao ở xa trung tâm thành phố, khiến du khách mất gần một tiếng đi xe mỗi ngày, đồng thời thực đơn ăn uống bị cắt giảm hoặc có nhiều điểm mua sắm chỉ định.\n\nTrong khi đó, gói Tiêu Chuẩn 4 Sao của TourLuk chú trọng bay các hãng hàng không chất lượng cao, lưu trú tại các khách sạn bốn sao ngay trung tâm để bạn dễ dàng dạo phố về đêm, thực đơn phong phú với tôm hùm và bò Úc, đồng thời bao gồm trọn gói vé tham quan và bảo hiểm quốc tế mức cao. Ngoài ra, với những gia đình có nhu cầu riêng tư, các gói tour may đo riêng sẽ cung cấp xe và hướng dẫn viên đồng hành linh hoạt theo giờ giấc của cả nhà.`,
        imageIndex: 0,
        imageCaption: `Khách sạn 4 sao tiêu chuẩn trung tâm giúp du khách nghỉ ngơi tiện nghi và thoải mái dạo phố về đêm.`,
      },
      {
        heading: `🔍 2. NHỮNG KHOẢN CẦN KIỂM TRA KỸ TRƯỚC KHI ĐẶT TOUR:`,
        text: `Để tránh những chi phí phát sinh bất ngờ, bạn hãy luôn hỏi rõ hợp đồng tour đã bao gồm lệ phí visa và chi phí lấy dấu vân tay hay chưa, tiền tip cho hướng dẫn viên và tài xế đã được tính vào giá trọn gói chưa, và các vé tham quan đắt giá như du thuyền vịnh Sydney hay cáp treo Blue Mountains đã có trong chương trình chưa. Quan trọng hơn cả là vị trí khách sạn nằm ở trung tâm hay vùng ven xa xôi, cũng như chính sách hoàn hủy minh bạch nếu có bất kỳ sự cố nào về visa.`,
        imageIndex: 1,
        imageCaption: `Trải nghiệm du thuyền trên vịnh Sydney được bao gồm trọn gói trong dịch vụ tiêu chuẩn của TourLuk.`,
      },
      {
        heading: `✅ CHÍNH SÁCH BẢO VỆ KHÁCH HÀNG TẠI TOURLUK:`,
        text: `TourLuk cam kết một hợp đồng minh bạch 100%, tuyệt đối không có chi phí ẩn phát sinh, đồng thời hỗ trợ bảo lưu và hoàn phí theo quy định rõ ràng nếu phát sinh sự cố về thủ tục visa.`,
      },
    ],
    cta: `NHẬN BẢNG BÁO GIÁ CHI TIẾT VÀ CHƯƠNG TRÌNH KHUYẾN MÃI MỚI NHẤT`,
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
        text: `Nước Úc rộng lớn ngang cả châu Âu, việc di chuyển giữa các bang sẽ làm mất của bạn ít nhất nửa ngày làm thủ tục sân bay. Với chuyến đi dưới tám ngày, bạn chỉ nên chọn tối đa hai bang tiêu biểu như Sydney và Melbourne để có thời gian thong thả ngắm cảnh mà không bị kiệt sức.`,
      },
      {
        heading: `📌 2. THỜI TIẾT MELBOURNE NỔI TIẾNG "4 MÙA TRONG 1 NGÀY"`,
        text: `Buổi sáng tại Melbourne có thể se lạnh 15 độ, ban trưa ấm áp 26 độ và khi chiều xuống lại lộng gió biển. Bạn nên luôn mang theo trang phục nhiều lớp như áo phông kết hợp áo cardigan mỏng và áo khoác gió nhẹ để dễ dàng thích nghi khi di chuyển qua các điểm tham quan.`,
        imageIndex: 0,
        imageCaption: `Thời tiết Melbourne thay đổi linh hoạt trong ngày đòi hỏi trang phục layering thông minh và thoải mái.`,
      },
      {
        heading: `📌 3. NƯỚC ÚC HẦU NHƯ THANH TOÁN KHÔNG DÙNG TIỀN MẶT`,
        text: `Bạn chỉ cần chuẩn bị một chiếc thẻ Visa hoặc Mastercard có tính năng chạm PayWave là đã có thể mua sắm từ chiếc vé tàu, ly cà phê Flat White đến bữa tối sang trọng. Bạn chỉ nên đổi sẵn một khoản nhỏ khoảng 100 đến 200 đô Úc tiền mặt để phòng hờ.`,
      },
      {
        heading: `📌 4. QUY ĐỊNH HẢI QUAN ÚC VÔ CÙNG KHẮT KHE`,
        text: `Bạn tuyệt đối không mang theo thịt tươi, thịt khô, trứng, tổ yến, trái cây tươi hoặc các loại hạt vào Úc. Với sự hướng dẫn tận tình từ các hướng dẫn viên TourLuk ngay từ sân bay Việt Nam, quá trình làm thủ tục qua cổng kiểm dịch Úc của bạn sẽ diễn ra vô cùng nhanh chóng và êm đẹp.`,
      },
      {
        heading: `📌 5. CHỌN KHUNG GIỜ VÀNG ĐỂ CÓ NHỮNG BỨC ẢNH ĐẸP`,
        text: `Để lưu giữ những bức ảnh check-in tuyệt đẹp không bị dính người, hướng dẫn viên TourLuk luôn sắp xếp đưa khách đến ngắm vịnh cảng Circular Quay vào khoảng 8:30 sáng, và đón hoàng hôn buông xuống trên cụm đá Mười Hai Tông Đồ kỳ vĩ khi chiều tà.`,
        imageIndex: 1,
        imageCaption: `Hoàng hôn buông xuống trên cụm đá 12 Vị Tông Đồ tạo nên khung cảnh tráng lệ bậc nhất tại bang Victoria.`,
      },
      {
        heading: `📌 6. ĐI BỘ VỪA SỨC VÀ ƯU TIÊN XE ĐÓN TẬN NƠI`,
        text: `Nhiều du khách đi tự túc thường mệt mỏi khi phải đi bộ từ 15.000 đến 20.000 bước mỗi ngày. Khi đi cùng TourLuk, xe riêng sẽ đưa đón bạn tận cửa khách sạn trung tâm, các chặng tản bộ ngắm cảnh chỉ kéo dài từ mười lăm đến hai mươi phút rất nhẹ nhàng và thư thái.`,
      },
      {
        heading: `📌 7. NƯỚC UỐNG CÔNG CỘNG ĐẠT CHUẨN TẠI ÚC`,
        text: `Nguồn nước máy công cộng tại Úc đạt chuẩn có thể uống trực tiếp tại vòi. Bạn chỉ cần mang theo một chiếc bình giữ nhiệt cá nhân để lấy nước tại các trụ công cộng ven đường, vừa tiện lợi vừa bảo vệ môi trường.`,
      },
      {
        heading: `📌 8. CHÊNH LỆCH MÚI GIỜ CHỈ 3 - 4 TIẾNG`,
        text: `Không giống như các chuyến đi châu Âu hay Mỹ bị lệch tới mười hai tiếng, múi giờ bờ Đông nước Úc chỉ đi trước Việt Nam khoảng ba đến bốn tiếng. Bạn chỉ cần chợp mắt một giấc trên máy bay là hôm sau đã hoàn toàn tỉnh táo để bắt đầu chuyến du ngoạn.`,
      },
      {
        heading: `📌 9. CHỌN SIM 4G TỪ CÁC NHÀ MẠNG UY TÍN`,
        text: `Bạn nên lựa chọn SIM của các nhà mạng lớn như Telstra hoặc Optus để luôn đảm bảo sóng 4G khỏe và ổn định, ngay cả khi di chuyển qua các cung đường đèo ven biển Great Ocean Road.`,
      },
      {
        heading: `📌 10. BỮA ĂN HÀI HÒA HỢP KHẨU VỊ`,
        text: `Việc ăn đồ Tây liên tục nhiều ngày dễ khiến người lớn tuổi thấy ngấy và nhớ hương vị quê nhà. TourLuk luôn khéo léo đan xen các bữa tiệc hải sản và bít tết bò Úc với các bữa cơm thuần Việt ấm áp có canh nóng và rau xào.`,
        imageIndex: 2,
        imageCaption: `Bữa ăn ấm cúng hợp khẩu vị người Việt giúp duy trì năng lượng dồi dào suốt hành trình khám phá.`,
      },
      {
        heading: `📌 11. MUA QUÀ TẠI NHỮNG ĐỊA CHỈ UY TÍN`,
        text: `Bạn nên ghé các chuỗi nhà thuốc lớn như Chemist Warehouse hoặc siêu thị Coles, Woolworths để mua thực phẩm chức năng và kem cừu với mức giá niêm yết rõ ràng, tránh mua tại các điểm bán hàng bị ép buộc.`,
      },
      {
        heading: `📌 12. CHUẨN BỊ THỦ TỤC VISA SỚM TỪ 1 ĐẾN 2 THÁNG`,
        text: `Thời gian xét duyệt visa du lịch Úc thường kéo dài từ hai đến bốn tuần. Việc nộp hồ sơ sớm sẽ giúp bạn chủ động thời gian, săn được vé máy bay khung giờ đẹp và giữ trọn vẹn mức giá ưu đãi tốt nhất cho chuyến đi.`,
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

