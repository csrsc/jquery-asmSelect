/*
 * Alternate Select Multiple (asmSelect) 1.0.6 - jQuery Plugin
 * http://www.ryancramer.com/projects/asmselect/
 *
 * Copyright (c) 2009 by Ryan Cramer - http://www.ryancramer.com
 *
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 *
 *	2024.11.01 - updated by csr:
 *		- reading 'msie', suggests that the jquery.asmselect.js file is trying to access a property that does not exist.
 *			(This issue often arises due to the removal of the $.browser and $.msie properties in jQuery v1.9+)
 *		- modified jquery.asmselect.js script by replacing references to $.browser.msie with a more modern approach (js - var isIE = /*@cc_on!@*/false || !!document.documentMode; // Detect IE)
 */

(function ($) {

    $.fn.asmSelect = function (customOptions) {

        const options = {
            listType: 'ol',                             // Ordered list 'ol', or unordered list 'ul'
            sortable: false,                            // Should the list be sortable?
            highlight: false,                           // Use the highlight feature?
            animate: false,                             // Animate the adding/removing of items in the list?
            addItemTarget: 'bottom',                    // Where to place new selected items in list: top or bottom
            hideWhenAdded: false,                       // Hide the option when added to the list?
            debugMode: false,                           // Debug mode keeps original select visible

            removeLabel: 'remove',                      // Text used in the "remove" link
            highlightAddedLabel: 'Added: ',             // Text that precedes highlight of added item
            highlightRemovedLabel: 'Removed: ',         // Text that precedes highlight of removed item

            containerClass: 'asmContainer',             // Class for container that wraps this widget
            selectClass: 'asmSelect',                   // Class for the newly created <select>
            optionDisabledClass: 'asmOptionDisabled',   // Class for items that are already selected / disabled
            listClass: 'asmList',                       // Class for the list ($ol)
            listSortableClass: 'asmListSortable',       // Another class given to the list when it is sortable
            listItemClass: 'asmListItem',               // Class for the <li> list items
            listItemLabelClass: 'asmListItemLabel',     // Class for the label text that appears in list items
            removeClass: 'asmListItemRemove',           // Class given to the "remove" link
            highlightClass: 'asmHighlight'              // Class given to the highlight <span>
        };

        $.extend(options, customOptions);

        return this.each(function (index) {
            const $original = $(this);                  // the original select multiple
            let $container;                             // a container that is wrapped around our widget
            let $select;                                // the new select we have created
            let $ol;                                    // the list that we are manipulating
            let buildingSelect = false;                 // is the new select being constructed right now?
            let ignoreOriginalChangeEvent = false;      // originalChangeEvent bypassed when this is true
            const $selectRemoved = $("<select></select>");

            function init() {
                // Initialize the alternate select multiple
                while ($("#" + options.containerClass + index).length > 0) index++;

                $select = $("<select></select>")
                    .addClass(options.selectClass)
                    .attr('name', options.selectClass + index)
                    .attr('id', options.selectClass + index);

                $ol = $("<" + options.listType + "></" + options.listType + ">")
                    .addClass(options.listClass)
                    .attr('id', options.listClass + index);

                $container = $("<div></div>")
                    .addClass(options.containerClass)
                    .attr('id', options.containerClass + index);

                buildSelect();

                $select.on('change', selectChangeEvent)
                       .on('click', selectClickEvent);

                $original.on('change', originalChangeEvent)
                        .wrap($container)
                        .before($select)
                        .before($ol);

                if (options.sortable && $.fn.sortable) makeSortable();

                // Use feature detection for inline-block support
                if (needsInlineBlockFix()) {
                    $ol.css('display', 'inline-block');
                }
            }

            function needsInlineBlockFix() {
                const temp = document.createElement('div');
                temp.style.display = 'inline-block';
                return temp.style.display === 'inline-block';
            }

            function makeSortable() {
                $ol.sortable({
                    items: 'li.' + options.listItemClass,
                    handle: '.' + options.listItemLabelClass,
                    axis: 'y',
                    update: function () {
                        let updatedOptionId;

                        $(this).children("li").each(function () {
                            const $option = $('#' + $(this).attr('rel'));

                            if ($(this).is(".ui-sortable-helper")) {
                                updatedOptionId = $option.attr('id');
                                return;
                            }

                            $original.append($option);
                        });

                        if (updatedOptionId) triggerOriginalChange(updatedOptionId, 'sort');
                    }
                }).addClass(options.listSortableClass);
            }

            function selectChangeEvent() {
                const id = $(this).children("option:selected").first().attr('rel');
                if (id) {
                    addListItem(id);
                    triggerOriginalChange(id, 'add');
                }
            }

            function selectClickEvent() {
                // Kept for backward compatibility
            }

            function originalChangeEvent() {
                if (ignoreOriginalChangeEvent) {
                    ignoreOriginalChangeEvent = false;
                    return;
                }

                $select.empty();
                $ol.empty();
                buildSelect();
            }

            function buildSelect() {
                buildingSelect = true;

                if ($original.attr('title')) {
                    $select.prepend("<option value=''>" + $original.attr('title') + "</option>");
                }

                $original.children("option").each(function (n) {
                    const $t = $(this);
                    let id;
                    const isSelected = $t.is(":selected");
                    const isDisabled = $t.is(":disabled");

                    if (!$t.attr('id')) $t.attr('id', 'asm' + index + 'option' + n);
                    id = $t.attr('id');

                    if (isSelected && !isDisabled) {
                        addListItem(id);
                        addSelectOption(id, true);
                    } else if (!isSelected && isDisabled) {
                        addSelectOption(id, true);
                    } else {
                        addSelectOption(id);
                    }
                });

                if (!options.debugMode) $original.hide();
                selectFirstItem();
                buildingSelect = false;
            }

            function addSelectOption(optionId, disabled = false) {
                const $O = $('#' + optionId);
                const $option = $("<option></option>")
                    .html($O.html())
                    .val($O.val())
                    .attr('rel', optionId);

                if (disabled) disableSelectOption($option);

                $select.append($option);
            }

            function selectFirstItem() {
                $select.children(":eq(0)").prop("selected", true);
            }

            function disableSelectOption($option) {
                $option.addClass(options.optionDisabledClass)
                       .prop("selected", false)
                       .prop("disabled", true);

                if (options.hideWhenAdded) $option.hide();
            }

            function enableSelectOption($option) {
                $option.removeClass(options.optionDisabledClass)
                       .prop("disabled", false);

                if (options.hideWhenAdded) $option.show();
            }

            function addListItem(optionId) {
                const $O = $('#' + optionId);
                if (!$O.length) return;

                const $removeLink = $("<a></a>")
                    .attr("href", "#")
                    .addClass(options.removeClass)
                    .html(options.removeLabel)
                    .on('click', function (e) {
                        e.preventDefault();
                        dropListItem($(this).parent('li').attr('rel'));
                    });

                const $itemLabel = $("<span></span>")
                    .addClass(options.listItemLabelClass)
                    .html($O.html());

                const $item = $("<li></li>")
                    .attr('rel', optionId)
                    .addClass(options.listItemClass)
                    .append($itemLabel)
                    .append($removeLink)
                    .hide();

                if (!buildingSelect) {
                    if ($O.is(":selected")) return;
                    $O.prop('selected', true);
                }

                if (options.addItemTarget === 'top' && !buildingSelect) {
                    $ol.prepend($item);
                    if (options.sortable) $original.prepend($O);
                } else {
                    $ol.append($item);
                    if (options.sortable) $original.append($O);
                }

                addListItemShow($item);
                disableSelectOption($("[rel=" + optionId + "]", $select));

                if (!buildingSelect) {
                    setHighlight($item, options.highlightAddedLabel);
                    selectFirstItem();
                    if (options.sortable && $ol.sortable("instance")) {
                        $ol.sortable("refresh");
                    }
                }
            }

            function addListItemShow($item) {
                if (options.animate && !buildingSelect) {
                    $item.animate(
                        { opacity: 1, height: "show" },
                        100,
                        function () {
                            $(this).animate({height: "+=2px"}, 50)
                                  .animate({height: "-=2px"}, 25);
                        }
                    );
                } else {
                    $item.show();
                }
            }

            function dropListItem(optionId, highlightItem = true) {
                const $O = $('#' + optionId);
                $O.prop('selected', false);

                const $item = $ol.children("li[rel=" + optionId + "]");
                dropListItemHide($item);
                enableSelectOption($("[rel=" + optionId + "]", 
                    options.removeWhenAdded ? $selectRemoved : $select));

                if (highlightItem) setHighlight($item, options.highlightRemovedLabel);
                triggerOriginalChange(optionId, 'drop');
            }

            function dropListItemHide($item) {
                if (options.animate && !buildingSelect) {
                    const $prevItem = $item.prev("li");
                    $item.animate(
                        { opacity: 0, height: "hide" },
                        100,
                        function () {
                            $prevItem.animate({height: "-=2px"}, 50)
                                   .animate({height: "+=2px"}, 100);
                            $item.remove();
                        }
                    );
                } else {
                    $item.remove();
                }
            }

            function setHighlight($item, label) {
                if (!options.highlight) return;

                $select.next("#" + options.highlightClass + index).remove();

                const $highlight = $("<span></span>")
                    .hide()
                    .addClass(options.highlightClass)
                    .attr('id', options.highlightClass + index)
                    .html(label + $item.children("." + options.listItemLabelClass).first().text());

                $select.after($highlight);

                $highlight.fadeIn("fast", function () {
                    setTimeout(() => $highlight.fadeOut("slow"), 50);
                });
            }

            function triggerOriginalChange(optionId, type) {
                ignoreOriginalChangeEvent = true;
                const $option = $("#" + optionId);

                const event = new CustomEvent('change', {
                    detail: {
                        option: $option,
                        value: $option.val(),
                        id: optionId,
                        item: $ol.children("[rel=" + optionId + "]"),
                        type: type
                    }
                });
                $original.get(0).dispatchEvent(event);
            }

            init();
        });
    };

})(jQuery);
