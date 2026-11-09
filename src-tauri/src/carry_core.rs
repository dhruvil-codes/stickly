#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Point {
    pub x: i32,
    pub y: i32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CarryState {
    Releasing,
    Armed,
    Pressed(Point),
    Finished(Option<Point>),
}

impl CarryState {
    pub fn new(left_down: bool) -> Self {
        if left_down {
            Self::Releasing
        } else {
            Self::Armed
        }
    }

    // Return true only for the placement click; the peel gesture's release passes through.
    pub fn mouse(&mut self, down: bool, point: Point) -> bool {
        match (*self, down) {
            (Self::Releasing, false) => *self = Self::Armed,
            (Self::Armed, true) => {
                *self = Self::Pressed(point);
                return true;
            }
            (Self::Pressed(point), false) => {
                *self = Self::Finished(Some(point));
                return true;
            }
            (Self::Pressed(_), true) => return true,
            _ => (),
        }
        false
    }

    pub fn cancel(&mut self) {
        *self = Self::Finished(None);
    }
}

pub fn following(cursor: Point, grip: Point) -> Point {
    Point {
        x: cursor.x.saturating_sub(grip.x),
        y: cursor.y.saturating_sub(grip.y),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const P: Point = Point { x: 100, y: 200 };

    #[test]
    fn peel_release_arms_without_pasting_then_swallows_a_complete_click() {
        let mut state = CarryState::new(true);
        assert!(!state.mouse(false, P));
        assert_eq!(state, CarryState::Armed);
        assert!(!state.mouse(false, P));
        assert!(state.mouse(true, P));
        assert_eq!(state, CarryState::Pressed(P));
        assert!(state.mouse(false, Point { x: 110, y: 220 }));
        assert_eq!(state, CarryState::Finished(Some(P)));
        assert!(!state.mouse(true, P));
    }

    #[test]
    fn keyboard_start_is_armed_and_cancellation_discards_placement() {
        for mut state in [
            CarryState::new(true),
            CarryState::new(false),
            CarryState::Pressed(P),
        ] {
            state.cancel();
            assert_eq!(state, CarryState::Finished(None));
            assert!(!state.mouse(false, P));
        }
        let mut state = CarryState::new(false);
        assert!(state.mouse(true, P));
    }

    #[test]
    fn placement_keeps_the_exact_anchor_at_desktop_edges_and_negative_coordinates() {
        let grip = Point { x: 200, y: 250 };
        for cursor in [
            Point { x: 0, y: 0 },
            Point { x: -1920, y: -400 },
            Point { x: 1919, y: 1079 },
        ] {
            let position = following(cursor, grip);
            assert_eq!(position.x + grip.x, cursor.x);
            assert_eq!(position.y + grip.y, cursor.y);
        }
    }

    #[test]
    fn following_preserves_the_physical_grip_and_saturates_extreme_coordinates() {
        let cursor = Point { x: 610, y: 410 };
        let grip = Point { x: 17, y: 29 };
        let expected = Point { x: 593, y: 381 };
        assert_eq!(following(cursor, grip), expected);
        assert_eq!(
            following(Point { x: i32::MIN, y: -5 }, grip),
            Point {
                x: i32::MIN,
                y: -34
            }
        );
    }

    #[test]
    fn signed_grips_preserve_handoff_when_the_cursor_has_left_the_window() {
        let cursor = Point { x: -300, y: 80 };
        let grip = Point { x: -25, y: -20 };
        let expected = Point { x: -275, y: 100 };
        assert_eq!(following(cursor, grip), expected);
    }
}
