using System;
using System.Collections.Generic;

namespace ECommerceBackend.DTOs.Cart
{
    public record CartItemDto(
        int VariantId,
        int ProductId,
        string ProductName,
        string VariantName,
        string Sku,
        string ImageUrl,
        decimal Price,
        int Quantity
    );

    public record CartDto(
        int UserId,
        List<CartItemDto> Items
    );

    public record AddToCartDto(
        int VariantId,
        int Quantity
    );

    public record UpdateCartItemQuantityDto(
        int VariantId,
        int Quantity
    );

    public record MergeCartRequestDto(
        List<AddToCartDto> Items
    );
}
