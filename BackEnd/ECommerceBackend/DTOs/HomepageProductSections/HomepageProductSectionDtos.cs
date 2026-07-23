using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using ECommerceBackend.DTOs.Products;

namespace ECommerceBackend.DTOs.HomepageProductSections;

public record HomepageProductSectionItemDto(
    int Itemid,
    int Sectionid,
    int Productid,
    int? Displayorder,
    bool? Isactive,
    DateTime? Createdat,
    ProductListItemDto? Product
);

public record HomepageProductSectionDto(
    int Sectionid,
    string Sectionkey,
    string Title,
    string? Subtitle,
    string Theme,
    int? Displayorder,
    bool? Isactive,
    DateTime? Createdat,
    List<HomepageProductSectionItemDto> Items
);

public record UpdateHomepageProductSectionRequestDto(
    [Required, StringLength(120)] string Title,
    [StringLength(300)] string? Subtitle,
    [Required, StringLength(30)] string Theme,
    int? Displayorder,
    bool? Isactive,
    List<UpdateHomepageProductSectionItemDto>? Items
);

public record UpdateHomepageProductSectionItemDto(
    [Required] int Productid,
    int? Displayorder,
    bool? Isactive
);

public record HomepageProductMetricDto(
    int Productid,
    int Soldquantity
);
