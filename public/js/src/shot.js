var Shot;
(function (Shot) {
    (function (Models) {
        var Editable = (function () {
            function Editable() {
                this.selected = false;
            }
            Editable.prototype.render = function () {
                var _this = this;
                this.el.on('click', function (e) {
                    var event = $.Event('click');

                    event.originalEvent = e;

                    $(_this).trigger(event);
                });

                return this;
            };

            Editable.prototype.select = function (selected) {
                this.selected = selected;

                this.el.toggleClass('selected', selected);

                return this;
            };

            Editable.prototype.isSelected = function () {
                return this.selected;
            };
            return Editable;
        })();
        Models.Editable = Editable;
    })(Shot.Models || (Shot.Models = {}));
    var Models = Shot.Models;
})(Shot || (Shot = {}));
$(function () {
    SHOT.app = new Shot.App();
});

var Shot;
(function (Shot) {
    var App = (function () {
        function App() {
            $(document).foundation();

            $(document).on('dragstart', 'img, a', function (e) {
                e.preventDefault();
            });

            $(document).on('touchstart', '.top-bar .toggle-topbar a', function (e) {
                e.preventDefault();

                $(e.target).trigger('click');
            });

            $(document).on('click', '.top-bar section a', function () {
                $('.top-bar').removeClass('expanded');
            });

            new Shot.Controllers[SHOT.controller]()[SHOT.action]();

            return this;
        }
        return App;
    })();
    Shot.App = App;
})(Shot || (Shot = {}));
var Shot;
(function (Shot) {
    (function (Controllers) {
        var Admin = (function () {
            function Admin() {
            }
            Admin.prototype.index = function () {
                var thumbnailGrid = $('.thumbnail-grid'), editMode = new Shot.EditMode();

                if (SHOT.albums) {
                    SHOT.albums.forEach(function (albumData) {
                        var album = new Shot.Models.Album(albumData);

                        album.data.link = SHOT.rootPath + 'admin/album/' + album.data.id;

                        thumbnailGrid.prepend(album.render().el);

                        $(album).on('delete', function () {
                            album.el.remove();

                            album = null;
                        });

                        editMode.push(album);
                    });
                }

                $('#album').on('submit', function (e) {
                    var album = null, title = $('#title').val();

                    e.preventDefault();

                    if (title) {
                        album = new Shot.Models.Album({ title: title }).render();

                        album.save().done(function (data) {
                            album.data.link = SHOT.rootPath + 'admin/album/' + data.id;

                            album.render();
                        }).fail(function () {
                            console.log('fail');
                        });

                        thumbnailGrid.prepend(album.el);

                        $(album).on('delete', function () {
                            album.el.remove();

                            album = null;
                        });

                        editMode.push(album);
                    }
                });
            };

            Admin.prototype.album = function () {
                var thumbnailSize = 480, thumbnailGrid = $('.thumbnail-grid'), thumbnailQueue = [], editMode = new Shot.EditMode(), fileTypes = [
                    'image/jpg',
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'image/bmp'
                ], preRender;

                if (SHOT.thumbnails) {
                    SHOT.thumbnails.forEach(function (thumbnailData) {
                        var thumbnail = new Shot.Models.Thumbnail(thumbnailData);

                        thumbnail.data.link = SHOT.rootPath + 'album/carousel/' + SHOT.album.id + '/' + thumbnail.data.id;

                        thumbnailGrid.append(thumbnail.render().el);

                        $(thumbnail).on('delete', function () {
                            thumbnail.el.remove();

                            thumbnail = null;
                        });

                        editMode.push(thumbnail);
                    });
                }

                $('#files').on('change', function (e) {
                    $.each(e.target.files, function (i, file) {
                        var thumbnail, progressBar;

                        if (file.name && $.inArray(file.type, fileTypes) !== -1) {
                            thumbnail = new Shot.Models.Thumbnail({ title: file.name.replace(/\..{1,4}$/, ''), file: file, formData: new FormData() }).render();
                            progressBar = new Shot.Models.ProgressBar().render();

                            thumbnail.data.formData.append('image', file);
                            thumbnail.data.formData.append('albumId', SHOT.album.id);

                            thumbnail.el.find('.container').append(progressBar.el);

                            thumbnailGrid.prepend(thumbnail.el);

                            $(thumbnail).on('delete', function () {
                                thumbnail.el.remove();

                                thumbnail = null;
                            });

                            thumbnail.save().done(function (data) {
                                progressBar.set(100, function () {
                                    var image = $('<img/>');

                                    image.hide().on('load', function (e) {
                                        thumbnail.el.find('.temporary').fadeOut('fast', function () {
                                            $(this).remove();
                                        });

                                        thumbnail.el.find('.processing').fadeOut('fast');

                                        $(e.target).fadeIn('fast', function () {
                                            thumbnail.data.link = SHOT.rootPath + 'album/carousel/' + SHOT.album.id + '/' + data.id;

                                            thumbnail.render();
                                        });
                                    }).prependTo(thumbnail.el.find('.container')).prop('src', data.path);

                                    editMode.push(thumbnail);
                                });
                            }).progress(function (data) {
                                progressBar.set(data);
                            }).fail(function (e) {
                                progressBar.set(0);

                                thumbnail.el.find('.container').addClass('error');

                                console.log('fail');
                            });

                            thumbnailQueue.push(thumbnail);
                        }
                    });

                    preRender = function (thumbnail, callback) {
                        var reader = new FileReader();

                        callback = typeof callback === 'function' ? callback : function () {
                        };

                        reader.onload = function (e) {
                            var image = $('<img/>');

                            image.on('load', function (e) {
                                var canvas = $('<canvas/>').get(0), size = {
                                    x: e.target.width < e.target.height ? thumbnailSize : e.target.width * thumbnailSize / e.target.height,
                                    y: e.target.height < e.target.width ? thumbnailSize : e.target.height * thumbnailSize / e.target.width
                                };

                                canvas.width = thumbnailSize;
                                canvas.height = thumbnailSize;

                                canvas.getContext('2d').drawImage(e.target, (canvas.width - size.x) / 2, (canvas.height - size.y) / 2, size.x, size.y);

                                $(canvas).hide().fadeIn('fast').addClass('temporary').prependTo(thumbnail.el.find('.container'));

                                callback();
                            });

                            image.on('error', function () {
                                return callback();
                            });

                            image.prop('src', e.target.result);
                        };

                        reader.onerror = function () {
                            return callback();
                        };

                        reader.readAsDataURL(thumbnail.data.file);
                    };

                    (function nextThumbnail() {
                        if (thumbnailQueue.length) {
                            preRender(thumbnailQueue.shift(), function () {
                                return nextThumbnail();
                            });
                        }
                    })();
                });
            };
            return Admin;
        })();
        Controllers.Admin = Admin;
    })(Shot.Controllers || (Shot.Controllers = {}));
    var Controllers = Shot.Controllers;
})(Shot || (Shot = {}));
var Shot;
(function (Shot) {
    (function (Controllers) {
        var Album = (function () {
            function Album() {
            }
            Album.prototype.grid = function () {
                var thumbnailGrid = $('.thumbnail-grid'), editMode = new Shot.EditMode();

                if (SHOT.thumbnails) {
                    SHOT.thumbnails.forEach(function (thumbnailData) {
                        var thumbnail = new Shot.Models.Thumbnail(thumbnailData);

                        thumbnail.data.link = SHOT.rootPath + 'album/carousel/' + SHOT.album.id + '/' + thumbnail.data.id;

                        thumbnailGrid.append(thumbnail.render().el);

                        $(thumbnail).on('delete', function () {
                            thumbnail.el.remove();

                            thumbnail = null;
                        });

                        editMode.push(thumbnail);
                    });
                }
            };

            Album.prototype.carousel = function () {
                var carousel = new Shot.Models.Carousel(SHOT.images), id, navItem = null;

                carousel.render();

                id = parseInt(location.pathname.replace(/^\/album\/carousel\/\d\/(\d)/, function (match, a) {
                    return a;
                }));

                carousel.el.on('change', function (e, image) {
                    if (navItem) {
                        navItem.remove();
                    }

                    navItem = $(Mustache.render($('#template-nav-item').html(), {
                        text: image.data.title.replace(/&amp;/g, '&'),
                        icon: 'picture-o',
                        url: SHOT.rootPath + 'album/' + SHOT.album.id + '/' + image.data.id,
                        left: true
                    }));

                    $('.top-bar .left').append(navItem);

                    if (image.data.id !== id) {
                        id = image.data.id;

                        history.pushState({ id: id }, '', '/album/carousel/' + SHOT.album.id + '/' + id);
                    }
                });

                if (id) {
                    carousel.show(id);
                }

                $('#carousel-wrap').append(carousel.el);

                $(window).on('popstate', function (e) {
                    if (e.originalEvent.state) {
                        carousel.show(e.originalEvent.state.id);
                    }
                });

                $(document).on('keydown', function (e) {
                    switch (e.keyCode) {
                        case 35:
                            e.preventDefault();

                            if (carousel.index < carousel.images.length - 1) {
                                carousel.show(carousel.images[carousel.images.length - 1].data.id);
                            }

                            break;
                        case 36:
                            e.preventDefault();

                            if (carousel.index > 0) {
                                carousel.show(carousel.images[0].data.id);
                            }

                            break;
                        case 33:
                        case 37:
                        case 38:
                            e.preventDefault();

                            if (carousel.index > 0) {
                                carousel.show(carousel.images[carousel.index - 1].data.id);
                            }

                            break;
                        case 32:
                        case 34:
                        case 39:
                        case 40:
                            e.preventDefault();

                            if (carousel.index < carousel.images.length - 1) {
                                carousel.show(carousel.images[carousel.index + 1].data.id);
                            }

                            break;
                    }
                });

                $(window).trigger('resize');
            };
            return Album;
        })();
        Controllers.Album = Album;
    })(Shot.Controllers || (Shot.Controllers = {}));
    var Controllers = Shot.Controllers;
})(Shot || (Shot = {}));
var Shot;
(function (Shot) {
    (function (Controllers) {
        var Index = (function () {
            function Index() {
            }
            Index.prototype.index = function () {
                var thumbnailGrid = $('.thumbnail-grid'), editMode = new Shot.EditMode();

                if (SHOT.albums) {
                    SHOT.albums.forEach(function (albumData) {
                        var album = new Shot.Models.Album(albumData);

                        album.data.link = SHOT.rootPath + 'album/grid/' + album.data.id;

                        thumbnailGrid.prepend(album.render().el);

                        $(album).on('delete', function () {
                            album.el.remove();

                            album = null;
                        });

                        editMode.push(album);
                    });
                }
            };
            return Index;
        })();
        Controllers.Index = Index;
    })(Shot.Controllers || (Shot.Controllers = {}));
    var Controllers = Shot.Controllers;
})(Shot || (Shot = {}));
var Shot;
(function (Shot) {
    var EditMode = (function () {
        function EditMode() {
            var _this = this;
            this.active = false;
            this.editables = [];
            var navItem;

            navItem = $(Mustache.render($('#template-nav-item').html(), {
                text: 'Edit mode',
                icon: 'wrench',
                right: true
            }));

            $('.top-bar .right').prepend(navItem);

            navItem.on('click', 'a', function () {
                _this.active = !_this.active;

                if (_this.active) {
                    _this.checkSelection();

                    _this.el.css({ bottom: -20, opacity: 0 }).show().animate({ bottom: 0, opacity: 1 }, 'fast');
                } else {
                    _this.el.animate({ bottom: -20, opacity: 0 }, 'fast');

                    _this.selectAll(false);
                }
            });

            this.template = $('#template-edit-mode').html();

            this.el = $(Mustache.render(this.template, {}));

            this.el.on('click', '.close', function (e) {
                e.preventDefault();

                $(e.target).blur();

                navItem.find('a').trigger('click');
            });

            this.el.on('click', '.select-all', function (e) {
                e.preventDefault();

                $(e.target).blur();

                _this.selectAll(true);
            });

            this.el.on('click', '.select-none', function (e) {
                e.preventDefault();

                $(e.target).blur();

                _this.selectAll(false);
            });

            this.el.on('click', '.edit', function (e) {
                e.preventDefault();

                $(e.target).blur();

                _this.edit();
            });

            this.el.on('click', '.delete', function (e) {
                e.preventDefault();

                $(e.target).blur();

                _this.delete();
            });

            $('body').append(this.el);
        }
        EditMode.prototype.edit = function () {
            var _this = this;
            var modal, selected = [];

            this.editables.forEach(function (editable) {
                if (editable.isSelected()) {
                    selected.push(editable);
                }
            });

            if (!selected) {
                return this;
            }

            modal = $(Mustache.render($('#template-edit-mode-edit').html(), {
                count: selected.length,
                image: this.type === 'image',
                album: this.type === 'album'
            }));

            modal.on('submit', 'form', function (e) {
                var title = modal.find(':input[name="title"]').val(), thumbCrop = modal.find(':input[name="thumb-crop"]:checked').val(), data = {
                    ids: [],
                    title: title
                };

                e.preventDefault();

                selected.forEach(function (editable) {
                    data.ids.push(editable.data.id);

                    editable.data.pending = true;
                    editable.data.error = false;

                    if (title) {
                        editable.data.title = title;
                    }

                    editable.render();
                });

                if (_this.type === 'image') {
                    data.thumbCrop = thumbCrop;
                }

                $.post(SHOT.rootPath + 'ajax/save' + (_this.type === 'image' ? 'Images' : 'Albums'), data).done(function () {
                    selected.forEach(function (editable) {
                        if (_this.type === 'image') {
                            editable.data.path = editable.data.path.replace(/\?[a-z]+$/, '?' + thumbCrop);
                        }

                        editable.data.pending = false;

                        editable.render();
                    });
                }).fail(function () {
                    selected.forEach(function (editable) {
                        editable.data.pending = false;
                        editable.data.error = true;

                        editable.render();
                    });
                });

                modal.remove();

                _this.el.show();
            });

            modal.on('click', '.cancel', function (e) {
                e.preventDefault();

                modal.remove();

                _this.el.show();
            });

            console.log($(document).scrollTop());

            modal.appendTo('body').show().find('.modal-content').css({ marginTop: $(document).scrollTop() + 'px' });

            this.el.hide();

            return this;
        };

        EditMode.prototype.delete = function () {
            var _this = this;
            var modal, selected = [];

            this.editables.forEach(function (editable) {
                if (editable.isSelected()) {
                    selected.push(editable);
                }
            });

            if (!selected) {
                return this;
            }

            modal = $(Mustache.render($('#template-edit-mode-delete').html(), {
                count: selected.length,
                image: this.type === 'image',
                album: this.type === 'album'
            }));

            modal.on('submit', 'form', function (e) {
                var ids = [];

                e.preventDefault();

                selected.forEach(function (editable) {
                    ids.push(editable.data.id);

                    _this.editables.splice(_this.editables.indexOf(editable), 1);

                    $(editable).trigger('delete');
                });

                $.post(SHOT.rootPath + 'ajax/delete' + (_this.type === 'image' ? 'Images' : 'Albums'), {
                    ids: ids
                });

                modal.remove();

                _this.el.show();
            });

            modal.on('click', '.cancel', function (e) {
                e.preventDefault();

                modal.remove();

                _this.el.show();
            });

            modal.appendTo('body').show().find('.modal-content').css({ marginTop: $(document).scrollTop() + 'px' });

            this.el.hide();

            return this;
        };

        EditMode.prototype.push = function (editable) {
            var _this = this;
            this.editables.push(editable);

            if (editable instanceof Shot.Models.Thumbnail) {
                this.type = 'image';
            }

            if (editable instanceof Shot.Models.Album) {
                this.type = 'album';
            }

            $(editable).on('click', function (e) {
                if (_this.active) {
                    e.originalEvent.preventDefault();

                    editable.select(!editable.isSelected());

                    _this.checkSelection();
                }
            });

            return this;
        };

        EditMode.prototype.selectAll = function (select) {
            this.editables.forEach(function (editable) {
                editable.select(select);
            });

            this.checkSelection();

            return this;
        };

        EditMode.prototype.checkSelection = function () {
            var selectedCount = 0;

            this.editables.forEach(function (editable) {
                if (editable.isSelected()) {
                    selectedCount++;
                }
            });

            this.el.find('.select-none, .edit, .albums, .delete').attr('disabled', !selectedCount);

            this.el.find('.select-all').attr('disabled', selectedCount === this.editables.length);

            return this;
        };
        return EditMode;
    })();
    Shot.EditMode = EditMode;
})(Shot || (Shot = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Shot;
(function (Shot) {
    (function (Models) {
        var Album = (function (_super) {
            __extends(Album, _super);
            function Album(data) {
                _super.call(this);
                this.data = data;
                this.save = function () {
                    var _this = this;
                    var deferred = $.Deferred();

                    this.data.pending = true;
                    this.data.error = false;

                    this.render();

                    if (this.id) {
                    } else {
                        $.post(SHOT.rootPath + 'ajax/saveAlbum', {
                            title: this.data.title
                        }).done(function (data) {
                            _this.data.id = data.id;
                            _this.data.pending = false;
                            _this.data.error = false;

                            deferred.resolve(data);
                        }).fail(function (e) {
                            _this.data.pending = false;
                            _this.data.error = true;

                            deferred.reject(e);
                        });
                    }

                    return deferred;
                };

                this.template = $('#template-album').html();
            }
            Album.prototype.render = function () {
                var el = $(Mustache.render(this.template, this.data, {}));

                if (this.el) {
                    this.el.replaceWith(el);
                }

                this.el = el;

                _super.prototype.render.call(this);

                this.select(this.isSelected());

                return this;
            };
            return Album;
        })(Models.Editable);
        Models.Album = Album;
    })(Shot.Models || (Shot.Models = {}));
    var Models = Shot.Models;
})(Shot || (Shot = {}));
var Shot;
(function (Shot) {
    (function (Models) {
        var Carousel = (function () {
            function Carousel(imagesData) {
                var _this = this;
                this.index = 0;
                this.images = [];
                this.animating = false;
                this.offset = 0;
                this.template = $('#template-carousel').html();

                imagesData.forEach(function (data) {
                    data.url = data.paths[2048];
                    data.link = SHOT.rootPath + 'album/' + SHOT.album.id + '/' + data.id;

                    _this.images.push(new Shot.Models.Image(data));
                });

                return this;
            }
            Carousel.prototype.render = function () {
                var _this = this;
                var el = $(Mustache.render(this.template, {}));

                if (this.el) {
                    this.el.replaceWith(el);
                }

                this.el = el;

                $(window).on('resize', function () {
                    _this.cutOff = $(window).width() / 2;
                }).trigger('resize');

                $(document).on('click', '.full-screen', function (e) {
                    ['c', 'mozC', 'webkitC', 'msC', 'oC'].forEach(function (prefix) {
                        var method = prefix + 'ancelFullScreen';

                        if (typeof document[method] === 'function') {
                            document[method]();
                        }
                    });
                });

                this.el.swipe(function (e, swipe) {
                    return _this.swipe(e, swipe);
                });

                return this;
            };

            Carousel.prototype.show = function (id) {
                var _this = this;
                if (this.current && this.current.data.id === id) {
                    return;
                }

                this.images.forEach(function (image, i) {
                    if (image.data.id === id) {
                        _this.index = i;
                    }
                });

                this.previous = this.index > 0 ? this.images[this.index - 1] : null;
                this.current = this.images[this.index];
                this.next = this.images.length > this.index + 1 ? this.images[this.index + 1] : null;

                ['previous', 'current', 'next'].forEach(function (container) {
                    var el = _this.el.find('.' + container);

                    el.empty();

                    if (_this[container]) {
                        el.append(_this[container].render().el);

                        _this[container].el.on('click', function (e) {
                            e.preventDefault();

                            if (container === 'current') {
                                if (!_this.animating) {
                                    _this.fullScreen(_this[container]);
                                }
                            } else {
                                _this.show(_this[container].data.id);
                            }
                        });
                    }
                });

                this.el.trigger('change', this.current);

                return this;
            };

            Carousel.prototype.fullScreen = function (image) {
                var fullScreen = $('.full-screen').get(0), el = $(fullScreen).find('img'), img = $('<img>');

                el.prop('src', image.data.url);

                img.on('load', function () {
                    el.replaceWith(el);
                }).prop('src', SHOT.rootPath + image.data.paths.original);

                ['r', 'mozR', 'webkitR', 'msR', 'oR'].forEach(function (prefix) {
                    var method = prefix + 'equestFullScreen';

                    if (typeof fullScreen[method] === 'function') {
                        fullScreen[method]();

                        return false;
                    }
                });

                return this;
            };

            Carousel.prototype.swipe = function (e, swipe) {
                var _this = this;
                var destination, distance, duration, wrap = this.el.find('.wrap');

                if (e === 'start') {
                    wrap.stop();

                    this.offset = wrap.position().left;
                }

                if (e === 'move') {
                    if (!this.animating) {
                        this.el.addClass('animating');

                        this.animating = true;
                    }

                    wrap.css({ opacity: (this.cutOff - Math.min(this.cutOff, Math.abs(swipe.x))) / this.cutOff, left: this.offset - Math.min(this.cutOff, Math.max(-this.cutOff, swipe.x)) });
                }

                if (e === 'end') {
                    if (swipe.distance < 50 || swipe.speed < this.cutOff || (swipe.direction === 'right' && this.index === 0) || (swipe.direction === 'left' && this.index === this.images.length - 1)) {
                        wrap.stop().animate({ opacity: 1, left: '-100%' }, 'normal', 'easeOutQuad', function () {
                            _this.el.removeClass('animating');

                            _this.animating = false;
                        });
                    } else {
                        destination = this.offset + (swipe.direction === 'right' ? this.cutOff : -this.cutOff);
                        distance = Math.abs(destination - wrap.position().left);
                        duration = distance / swipe.speed * 1000;

                        wrap.stop().animate({ opacity: 0, left: destination }, duration, 'easeOutQuad', function () {
                            wrap.stop().css({ left: '-100%' }).animate({ opacity: 1 }, duration / 2, 'easeInQuad');

                            _this.el.removeClass('animating');

                            _this.animating = false;

                            _this.show(swipe.direction === 'right' ? (_this.previous ? _this.previous.data.id : null) : (_this.next ? _this.next.data.id : null));
                        });
                    }
                }
            };
            return Carousel;
        })();
        Models.Carousel = Carousel;
    })(Shot.Models || (Shot.Models = {}));
    var Models = Shot.Models;
})(Shot || (Shot = {}));
var Shot;
(function (Shot) {
    (function (Models) {
        var Image = (function () {
            function Image(data) {
                this.data = data;
                this.loaded = false;
                this.template = $('#template-image').html();

                return this;
            }
            Image.prototype.render = function () {
                var _this = this;
                var data = $.extend({}, this.data), id = new Date().getTime() + Math.round(Math.random() * 999), el, preview;

                if (this.loaded) {
                    el = $(Mustache.render(this.template, data));

                    this.el.replaceWith(el);

                    this.el = el;
                } else {
                    data.url = this.data.paths.preview;

                    this.el = $(Mustache.render(this.template, data));

                    preview = this.el.find('img');

                    $(window).on('resize.' + id, function () {
                        return _this.resize(preview);
                    });

                    preview.hide().on('load', function () {
                        $(window).trigger('resize.' + id);

                        preview.show();
                    });

                    el = $('<img/>');

                    el.prop('src', this.data.url).on('load', function (e) {
                        _this.loaded = true;

                        $(window).off('resize.' + id);

                        preview.replaceWith(el);
                    });
                }

                return this;
            };

            Image.prototype.resize = function (el) {
                var size = { x: this.data.width, y: this.data.height }, parentSize;

                if (!$.contains(document.documentElement, this.el.get(0))) {
                    return;
                }

                parentSize = {
                    x: this.el.parent().width(),
                    y: this.el.parent().height()
                };

                if (size.x > parentSize.x) {
                    size.y *= parentSize.x / size.x;
                    size.x = parentSize.x;
                }

                if (size.y > parentSize.y) {
                    size.x *= parentSize.y / size.y;
                    size.y = parentSize.y;
                }

                el.css({
                    position: 'absolute',
                    top: (parentSize.y / 2) - (size.y / 2),
                    height: size.y,
                    width: size.x
                });

                switch (this.el.css('textAlign')) {
                    case 'start':
                        el.css({ left: 0 });

                        break;
                    case 'center':
                        el.css({ left: (parentSize.x / 2) - (size.x / 2) });

                        break;
                    case 'right':
                        el.css({ right: 0 });

                        break;
                }

                return this;
            };
            return Image;
        })();
        Models.Image = Image;
    })(Shot.Models || (Shot.Models = {}));
    var Models = Shot.Models;
})(Shot || (Shot = {}));
var Shot;
(function (Shot) {
    (function (Models) {
        var ProgressBar = (function () {
            function ProgressBar() {
                this.template = $('#template-progressbar').html();
            }
            ProgressBar.prototype.render = function () {
                this.el = $(Mustache.render(this.template, {}));

                return this;
            };

            ProgressBar.prototype.set = function (percentage, callback) {
                var _this = this;
                this.el.find('.progressbar').stop(true, true).animate({ width: percentage + '%' }, 200, function () {
                    if (percentage === 100) {
                        _this.el.fadeOut('fast');
                    }

                    if (typeof callback === 'function') {
                        callback();
                    }
                });

                return this;
            };
            return ProgressBar;
        })();
        Models.ProgressBar = ProgressBar;
    })(Shot.Models || (Shot.Models = {}));
    var Models = Shot.Models;
})(Shot || (Shot = {}));
var Shot;
(function (Shot) {
    (function (Models) {
        var Thumbnail = (function (_super) {
            __extends(Thumbnail, _super);
            function Thumbnail(data) {
                _super.call(this);
                this.data = data;

                this.template = $('#template-thumbnail').html();
            }
            Thumbnail.prototype.render = function () {
                var el = $(Mustache.render(this.template, this.data));

                if (this.el) {
                    this.el.replaceWith(el);
                }

                this.el = el;

                _super.prototype.render.call(this);

                this.select(this.isSelected());

                return this;
            };

            Thumbnail.prototype.save = function () {
                var _this = this;
                var deferred = $.Deferred();

                this.data.pending = true;
                this.data.error = false;

                this.render();

                if (this.data.id) {
                } else {
                    this.data.formData.append('title', this.data.title);

                    $.ajax(SHOT.rootPath + 'ajax/saveImage', {
                        type: 'POST',
                        data: this.data.formData,
                        processData: false,
                        contentType: false,
                        cache: false,
                        xhr: function () {
                            var xhr = $.ajaxSettings.xhr();

                            if (xhr.upload) {
                                xhr.upload.addEventListener('progress', function (e) {
                                    if (e.lengthComputable) {
                                        deferred.notify((e.loaded / e.total) * 100);
                                    }
                                }, false);
                            }

                            return xhr;
                        }
                    }).done(function (data) {
                        _this.data.id = data.id;
                        _this.data.path = data.path;
                        _this.data.pending = false;
                        _this.data.error = false;

                        deferred.resolve(data);
                    }).fail(function (e) {
                        _this.data.pending = false;
                        _this.data.error = true;

                        deferred.reject(e);
                    });
                }

                return deferred;
            };
            return Thumbnail;
        })(Models.Editable);
        Models.Thumbnail = Thumbnail;
    })(Shot.Models || (Shot.Models = {}));
    var Models = Shot.Models;
})(Shot || (Shot = {}));
