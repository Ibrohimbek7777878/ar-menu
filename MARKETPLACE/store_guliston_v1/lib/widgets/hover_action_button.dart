import 'package:flutter/material.dart';
import 'package:flutter/widgets.dart';

/// A button that scales up slightly when hovered (desktop/web).
/// Wraps an [IconButton] and animates its scale.
class HoverActionButton extends StatefulWidget {
  final IconData icon;
  final Color? color;
  final VoidCallback onPressed;
  final double size;
  const HoverActionButton({
    Key? key,
    required this.icon,
    required this.onPressed,
    this.color,
    this.size = 20,
  }) : super(key: key);

  @override
  State<HoverActionButton> createState() => _HoverActionButtonState();
}

class _HoverActionButtonState extends State<HoverActionButton> {
  bool _hover = false;
  @override
  Widget build(BuildContext context) {
    final scale = _hover ? 1.2 : 1.0;
    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: AnimatedScale(
        scale: scale,
        duration: const Duration(milliseconds: 150),
        child: IconButton(
          icon: Icon(widget.icon, color: widget.color, size: widget.size),
          onPressed: widget.onPressed,
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
        ),
      ),
    );
  }
}
