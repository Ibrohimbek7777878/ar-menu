class ShopTemplate {
  final int id;
  final String name;
  final String slug;
  final String category;
  final String? previewImage;
  final String? previewMobile;
  final String? previewDesktop;
  final List<Map<String, dynamic>> defaultLayout;
  final Map<String, dynamic> defaultColors;
  final Map<String, dynamic> defaultFonts;
  final List<String> availableSections;
  final String requiredPlan;
  final bool isPremium;
  final bool isActive;
  final List<String> tags;
  final String? previewUrl;
  final String? previewMobileUrl;
  final String? previewDesktopUrl;

  ShopTemplate({
    required this.id,
    required this.name,
    required this.slug,
    required this.category,
    this.previewImage,
    this.previewMobile,
    this.previewDesktop,
    required this.defaultLayout,
    required this.defaultColors,
    required this.defaultFonts,
    required this.availableSections,
    required this.requiredPlan,
    required this.isPremium,
    required this.isActive,
    required this.tags,
    this.previewUrl,
    this.previewMobileUrl,
    this.previewDesktopUrl,
  });

  factory ShopTemplate.fromJson(Map<String, dynamic> json) {
    return ShopTemplate(
      id: json['id'] as int,
      name: json['name'] as String,
      slug: json['slug'] as String,
      category: json['category'] as String,
      previewImage: json['preview_image'] as String?,
      previewMobile: json['preview_mobile'] as String?,
      previewDesktop: json['preview_desktop'] as String?,
      defaultLayout: ((json['layout'] ?? json['default_layout']) as List<dynamic>?)
          ?.cast<Map<String, dynamic>>() ?? [],
      defaultColors: (json['colors'] ?? json['default_colors']) as Map<String, dynamic>? ?? {},
      defaultFonts: (json['fonts'] ?? json['default_fonts']) as Map<String, dynamic>? ?? {},
      availableSections: (json['available_sections'] as List<dynamic>?)
          ?.cast<String>() ?? [],
      requiredPlan: json['required_plan'] as String? ?? 'basic',
      isPremium: json['is_premium'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
      tags: (json['tags'] as List<dynamic>?)?.cast<String>() ?? [],
      previewUrl: json['preview_url'] as String?,
      previewMobileUrl: json['preview_mobile_url'] as String?,
      previewDesktopUrl: json['preview_desktop_url'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'slug': slug,
    'category': category,
    'preview_image': previewImage,
    'preview_mobile': previewMobile,
    'preview_desktop': previewDesktop,
    'default_layout': defaultLayout,
    'default_colors': defaultColors,
    'default_fonts': defaultFonts,
    'available_sections': availableSections,
    'required_plan': requiredPlan,
    'is_premium': isPremium,
    'is_active': isActive,
    'tags': tags,
    'preview_url': previewUrl,
    'preview_mobile_url': previewMobileUrl,
    'preview_desktop_url': previewDesktopUrl,
  };

  @override
  String toString() => 'ShopTemplate(name: $name, slug: $slug, category: $category)';
}